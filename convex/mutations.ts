import { getOrThrow } from "convex-helpers/server/relationships"
import { Infer, Validator, v } from "convex/values"
import { z } from "zod"
import { Id } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"

type WorldMutationType =
	| "setWorldTime"
	| "setProperty"
	| "removeProperty"
	| "createCharacter"
	| "setCharacterLocation"
	| "setCharacterPronouns"
	| "createLocation"

export const worldMutationInputSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("setWorldTime"),
		time: z.string(),
	}),
	z.object({
		type: z.literal("setProperty"),
		entityType: z.union([z.literal("character"), z.literal("location")]),
		entityName: z.string(),
		key: z.string(),
		value: z.string(),
	}),
	z.object({
		type: z.literal("removeProperty"),
		entityType: z.union([z.literal("character"), z.literal("location")]),
		entityName: z.string(),
		key: z.string(),
	}),
	z.object({
		type: z.literal("createCharacter"),
		name: z.string(),
		pronouns: z.string(),
		location: z.string(),
	}),
	z.object({
		type: z.literal("setCharacterLocation"),
		name: z.string(),
		location: z.string(),
	}),
	z.object({
		type: z.literal("setCharacterPronouns"),
		name: z.string(),
		pronouns: z.string(),
	}),
	z.object({
		type: z.literal("createLocation"),
		name: z.string(),
	}),
]) satisfies z.ZodType<{ type: WorldMutationType }>

export const worldMutationRecordValidator = v.union(
	v.object({
		type: v.literal("setWorldTime"),
		worldId: v.id("worlds"),
		worldName: v.string(),
		time: v.string(),
	}),
	v.object({
		type: v.literal("setProperty"),
		entity: v.union(
			v.object({
				type: v.literal("character"),
				id: v.id("characters"),
				name: v.string(),
			}),
			v.object({
				type: v.literal("location"),
				id: v.id("locations"),
				name: v.string(),
			}),
		),
		key: v.string(),
		value: v.string(),
	}),
	v.object({
		type: v.literal("removeProperty"),
		entity: v.union(
			v.object({
				type: v.literal("character"),
				id: v.id("characters"),
				name: v.string(),
			}),
			v.object({
				type: v.literal("location"),
				id: v.id("locations"),
				name: v.string(),
			}),
		),
		key: v.string(),
	}),
	v.object({
		type: v.literal("setCharacterLocation"),
		characterId: v.id("characters"),
		characterName: v.string(),
		locationId: v.id("locations"),
		locationName: v.string(),
	}),
	v.object({
		type: v.literal("setCharacterPronouns"),
		characterId: v.id("characters"),
		characterName: v.string(),
		pronouns: v.string(),
	}),
	v.object({
		type: v.literal("createCharacter"),
		characterId: v.id("characters"),
		characterName: v.string(),
		pronouns: v.string(),
		locationId: v.id("locations"),
		locationName: v.string(),
	}),
	v.object({
		type: v.literal("createLocation"),
		locationId: v.id("locations"),
		locationName: v.string(),
	}),
) satisfies Validator<{ type: WorldMutationType }, "required", string>

export const apply = internalMutation(
	async (
		ctx,
		{
			promptId,
			mutation,
			worldId,
		}: {
			promptId: Id<"prompts">
			mutation: z.input<typeof worldMutationInputSchema>
			worldId: Id<"worlds">
		},
	) => {
		let appliedMutation: Infer<typeof worldMutationRecordValidator>

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
					existingLocation &&
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
					existingCharacter &&
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
