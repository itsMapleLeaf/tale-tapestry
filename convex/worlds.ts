import { getOrThrow } from "convex-helpers/server/relationships"
import { partial } from "convex-helpers/validators"
import { ConvexError, Infer, v } from "convex/values"
import { z } from "zod"
import { omit } from "../src/lib/object.ts"
import { api, internal } from "./_generated/api"
import { Id } from "./_generated/dataModel"
import {
	QueryCtx,
	action,
	internalMutation,
	mutation,
	query,
} from "./_generated/server"
import { createParsedCompletion } from "./ai.ts"
import { actionPromptWorldMutationSchema } from "./characters.ts"
import schema, { worldMutationValidator } from "./schema.ts"
import { ensureApiKey, ensureAuthUser, ensureAuthUserId } from "./users.ts"

export const create = mutation({
	args: {
		...omit(schema.tables.worlds.validator.fields, ["creatorId"]),
	},
	handler: async (ctx, args) => {
		const userId = await ensureAuthUserId(ctx)
		return await ctx.db.insert("worlds", {
			...args,
			creatorId: userId,
		})
	},
})

export const list = query({
	handler: async (ctx) => {
		const userId = await ensureAuthUserId(ctx)
		return await ctx.db
			.query("worlds")
			.withIndex("creatorId", (q) => q.eq("creatorId", userId))
			.collect()
	},
})

export const get = query({
	args: { worldId: v.id("worlds") },
	handler: async (ctx, { worldId }) => {
		const world = await getOrThrow(ctx, worldId)
		await ensureViewerWorldAccess(ctx, world._id)
		return world
	},
})

export const update = internalMutation({
	args: {
		...partial(schema.tables.worlds.validator.fields),
		worldId: v.id("worlds"),
	},
	handler: async (ctx, { worldId, ...args }) => {
		await ctx.db.patch(worldId, args)
	},
})

export const remove = mutation({
	args: { id: v.id("worlds") },
	handler: async (ctx, args) => {
		const userId = await ensureAuthUserId(ctx)
		const world = await ctx.db.get(args.id)

		if (!world) {
			throw new ConvexError({ message: "world not found", worldId: args.id })
		}

		if (world.creatorId !== userId) {
			throw new ConvexError({
				message: "Not authorized to delete this world",
				world,
				userId,
			})
		}

		await ctx.db.delete(args.id)
	},
})

export const suggestNames = action({
	args: {
		theme: v.string(),
	},
	async handler(ctx, args) {
		const user = await ensureAuthUser(ctx)
		if (!user.openRouterApiKey) {
			throw new ConvexError("No OpenRouter API key set")
		}

		return await createParsedCompletion({
			apiKey: user.openRouterApiKey,
			model: "openai/gpt-4o-mini-2024-07-18",
			systemMessage: `Your job is to generate suggestions for the user to create their content.`,
			userMessage: `Generate a list of 20 unique name suggestions for a fictional world with the theme "${args.theme}".`,
			schema: z.object({ suggestions: z.string().array() }),
		})
	},
})

export const createInitialContent = action({
	args: {
		name: v.string(),
		pronouns: v.string(),
		description: v.string(),
		location: v.string(),
		time: v.string(),
		worldId: v.id("worlds"),
	},
	handler: async (
		ctx,
		{ name, time, pronouns, description, location, worldId },
	): Promise<{ characterId: Id<"characters"> }> => {
		const user = await ctx.runQuery(api.users.me)
		if (!user) {
			throw new ConvexError("Unauthorized")
		}
		const apiKey = await ensureApiKey(user)

		const completion = await createParsedCompletion({
			apiKey,
			model: "openai/gpt-4o-mini-2024-07-18",
			systemMessage: `
You are the backbone of a fictional world simulation. The user is creating their first character and location for the world.

Here is their input:
${JSON.stringify({ character: { name, pronouns, description }, location: { name: location, time } }, null, 2)}

Return the following in a JSON object:
- character.name: Their character name, but with proper name casing.
- character.properties: A list of key/value properties derived from the character description, such as their appearance, likes, dislikes, personality traits, hobbies, and so on. Example: when given "a friendly florist who loves pancakes", you could return [["occupation","florist"],["personality","friendly"],["likes","pancakes"]]. Do not repeat any keys. If you find several values that would fit one key, return a single key/value pair with a comma-separated list of values.
- location.name: Interpret the given location name from the character's point of view and return a general proper name. For example, with a character named "Allison", "their house" should become "Allison's House".
- location.time: Interpret the given  time and return either a fuzzy time, like "Early Morning", or a precise clock time rounded to the hour, like "3 PM".
`.trim(),
			schema: z.object({
				character: z.object({
					name: z.string(),
					properties: z.array(
						z.object({
							key: z.string(),
							value: z.string(),
						}),
					),
				}),
				location: z.object({
					name: z.string(),
					time: z.string(),
				}),
			}),
		})

		const locationId = await ctx.runMutation(api.locations.create, {
			name: completion.location.name,

			properties: {},
			worldId,
		})

		const characterId = await ctx.runMutation(api.characters.create, {
			name: completion.character.name,
			pronouns,
			properties: Object.fromEntries(
				completion.character.properties.map(({ key, value }) => [key, value]),
			),
			worldId,
			locationId,
		})

		await ctx.runMutation(internal.worlds.update, {
			worldId,
			time: completion.location.time,
		})

		return { characterId }
	},
})

export const stateUpdateSchema = z.object({
	characters: z.array(
		z.object({
			name: z.string(),
			pronouns: z.string(),
			properties: z.array(z.object({ key: z.string(), value: z.string() })),
		}),
	),
	locations: z.array(
		z.object({
			name: z.string(),
			properties: z.array(z.object({ key: z.string(), value: z.string() })),
		}),
	),
	world: z.object({
		time: z.string(),
	}),
})

export const applyWorldMutation = internalMutation(
	async (
		ctx,
		{
			promptId,
			mutation,
			worldId,
		}: {
			promptId: Id<"prompts">
			mutation: z.input<typeof actionPromptWorldMutationSchema>
			worldId: Id<"worlds">
		},
	) => {
		let appliedMutation: Infer<typeof worldMutationValidator>

		switch (mutation.type) {
			case "setWorldTime": {
				const world = await ctx.db.get(worldId)
				if (!world) {
					console.warn(
						"Failed to apply setWorldTime mutation: World not found",
						{ mutation },
					)
					return
				}

				if (world.time === mutation.time) return

				await ctx.db.patch(worldId, { time: mutation.time })
				appliedMutation = {
					type: "setWorldTime",
					worldId,
					worldName: world.name,
					time: mutation.time,
				}
				break
			}

			case "setCharacterLocation": {
				const character = await ctx.db
					.query("characters")
					.withSearchIndex("search_name", (q) =>
						q.search("name", mutation.name).eq("worldId", worldId),
					)
					.first()
				if (!character) {
					console.warn(
						"Failed to apply setCharacterLocation mutation: Character not found",
						{ mutation, worldId },
					)
					return
				}

				const location = await ctx.db
					.query("locations")
					.withSearchIndex("search_name", (q) =>
						q.search("name", mutation.location).eq("worldId", worldId),
					)
					.first()
				if (!location) {
					console.warn(
						"Failed to apply setCharacterLocation mutation: Location not found",
						{ mutation, worldId, characterId: character._id },
					)
					return
				}

				if (character.locationId === location._id) return

				await ctx.db.patch(character._id, {
					locationId: location._id,
				})

				appliedMutation = {
					type: "setCharacterLocation",
					characterId: character._id,
					characterName: character.name,
					locationId: location._id,
					locationName: location.name,
				}
				break
			}

			case "setCharacterPronouns": {
				const character = await ctx.db
					.query("characters")
					.withSearchIndex("search_name", (q) =>
						q.search("name", mutation.name).eq("worldId", worldId),
					)
					.first()
				if (!character) {
					console.warn(
						"Failed to apply setCharacterPronouns mutation: Character not found",
						{ mutation, worldId },
					)
					return
				}

				if (character.pronouns === mutation.pronouns) return

				await ctx.db.patch(character._id, {
					pronouns: mutation.pronouns,
				})

				appliedMutation = {
					type: "setCharacterPronouns",
					characterId: character._id,
					characterName: character.name,
					pronouns: mutation.pronouns,
				}
				break
			}

			case "createLocation": {
				// Check if location already exists
				const existingLocation = await ctx.db
					.query("locations")
					.withSearchIndex("search_name", (q) =>
						q.search("name", mutation.name).eq("worldId", worldId),
					)
					.first()

				if (
					existingLocation?.name.toLowerCase() === mutation.name.toLowerCase()
				) {
					console.warn(
						"Failed to create location: Location with similar name already exists",
						{ mutation, worldId, existingLocationId: existingLocation._id },
					)
					return
				}

				const locationId = await ctx.db.insert("locations", {
					name: mutation.name,
					properties: {},
					worldId,
				})

				appliedMutation = {
					type: "createLocation",
					locationId,
					locationName: mutation.name,
				}
				break
			}

			case "createCharacter": {
				// Check if character already exists
				const existingCharacter = await ctx.db
					.query("characters")
					.withSearchIndex("search_name", (q) =>
						q.search("name", mutation.name).eq("worldId", worldId),
					)
					.first()

				if (
					existingCharacter?.name.toLowerCase() === mutation.name.toLowerCase()
				) {
					console.warn(
						"Failed to create character: Character with similar name already exists",
						{ mutation, worldId, existingCharacterId: existingCharacter._id },
					)
					return
				}

				// Find or create the location
				let location = await ctx.db
					.query("locations")
					.withSearchIndex("search_name", (q) =>
						q.search("name", mutation.location).eq("worldId", worldId),
					)
					.first()

				if (!location) {
					const locationId = await ctx.db.insert("locations", {
						name: mutation.location,
						properties: {},
						worldId,
					})
					location = await getOrThrow(ctx, locationId)
				}

				const characterId = await ctx.db.insert("characters", {
					name: mutation.name,
					pronouns: mutation.pronouns,
					properties: {},
					worldId,
					locationId: location._id,
				})

				appliedMutation = {
					type: "createCharacter",
					characterId,
					characterName: mutation.name,
					pronouns: mutation.pronouns,
					locationId: location._id,
					locationName: location.name,
				}
				break
			}

			case "removeProperty": {
				if (mutation.entityType === "character") {
					const character = await ctx.db
						.query("characters")
						.withSearchIndex("search_name", (q) =>
							q.search("name", mutation.entityName).eq("worldId", worldId),
						)
						.first()
					if (!character) {
						console.warn(
							"Failed to apply removeProperty mutation: Character not found",
							{ mutation, worldId },
						)
						return
					}

					if (!(mutation.key in character.properties)) return

					const newProperties = { ...character.properties }
					delete newProperties[mutation.key]

					await ctx.db.patch(character._id, {
						properties: newProperties,
					})

					appliedMutation = {
						type: "removeProperty",
						entity: {
							type: "character",
							id: character._id,
							name: character.name,
						},
						key: mutation.key,
					}
				} else {
					const location = await ctx.db
						.query("locations")
						.withSearchIndex("search_name", (q) =>
							q.search("name", mutation.entityName).eq("worldId", worldId),
						)
						.first()
					if (!location) {
						console.warn(
							"Failed to apply removeProperty mutation: Location not found",
							{ mutation, worldId },
						)
						return
					}

					if (!(mutation.key in location.properties)) return

					const newProperties = { ...location.properties }
					delete newProperties[mutation.key]

					await ctx.db.patch(location._id, {
						properties: newProperties,
					})

					appliedMutation = {
						type: "removeProperty",
						entity: {
							type: "location",
							id: location._id,
							name: location.name,
						},
						key: mutation.key,
					}
				}
				break
			}

			case "setProperty": {
				if (mutation.entityType === "character") {
					const character = await ctx.db
						.query("characters")
						.withSearchIndex("search_name", (q) =>
							q.search("name", mutation.entityName).eq("worldId", worldId),
						)
						.first()
					if (!character) {
						console.warn(
							"Failed to apply setProperty mutation: Character not found",
							{ mutation, worldId },
						)
						return
					}

					if (character.properties[mutation.key] === mutation.value) return

					await ctx.db.patch(character._id, {
						properties: {
							...character.properties,
							[mutation.key]: mutation.value,
						},
					})

					appliedMutation = {
						type: "setProperty",
						entity: {
							type: "character",
							id: character._id,
							name: character.name,
						},
						key: mutation.key,
						value: mutation.value,
					}
				} else {
					const location = await ctx.db
						.query("locations")
						.withSearchIndex("search_name", (q) =>
							q.search("name", mutation.entityName).eq("worldId", worldId),
						)
						.first()
					if (!location) {
						console.warn(
							"Failed to apply setProperty mutation: Location not found",
							{ mutation, worldId },
						)
						return
					}

					if (location.properties[mutation.key] === mutation.value) return

					await ctx.db.patch(location._id, {
						properties: {
							...location.properties,
							[mutation.key]: mutation.value,
						},
					})

					appliedMutation = {
						type: "setProperty",
						entity: {
							type: "location",
							id: location._id,
							name: location.name,
						},
						key: mutation.key,
						value: mutation.value,
					}
				}
				break
			}
		}

		// Record the applied mutation for history
		if (appliedMutation) {
			const prompt = await ctx.db.get(promptId)
			await ctx.db.patch(promptId, {
				mutations: [...(prompt?.mutations ?? []), appliedMutation],
			})
		}
	},
)

export async function ensureViewerWorldAccess(
	ctx: QueryCtx,
	worldId: Id<"worlds">,
) {
	const user = await ensureAuthUser(ctx)
	const world = await getOrThrow(ctx, worldId)
	if (world.creatorId !== user._id) {
		throw new ConvexError("Unauthorized")
	}
}
