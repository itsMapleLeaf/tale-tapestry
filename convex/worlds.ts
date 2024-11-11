import { getOrThrow } from "convex-helpers/server/relationships"
import { partial } from "convex-helpers/validators"
import { ConvexError, v } from "convex/values"
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
import schema from "./schema.ts"
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
		const userId = await ensureAuthUserId(ctx)
		const world = await ctx.db.get(worldId)
		if (!world || world.creatorId !== userId) {
			return null
		}
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
- character.properties: A list of key/value properties derived from the character description, such as their appearance, likes, dislikes, personality traits, hobbies, and so on. Example: when given "a friendly florist who loves pancakes", you could return [{key:"occupation",value:"florist"},{key:"personality",value:"friendly"},{key:"likes",value:"pancakes"}]. Do not repeat any keys. If you find several values that would fit one key, return a single key/value pair with a comma-separated list of values.
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
