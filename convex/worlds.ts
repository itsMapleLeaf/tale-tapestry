import { ConvexError, v } from "convex/values"
import { z } from "zod"
import { action, internalMutation, mutation, query } from "./_generated/server"
import { createParsedCompletion } from "./ai.ts"
import { ensureAuthUser, ensureAuthUserId } from "./auth.ts"
import { getPlayer } from "./players.ts"

export const create = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await ensureAuthUserId(ctx)
		return await ctx.db.insert("worlds", { ...args, creatorId: userId })
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
	args: { id: v.id("worlds") },
	handler: async (ctx, args) => {
		const userId = await ensureAuthUserId(ctx)
		const world = await ctx.db.get(args.id)
		if (!world || world.creatorId !== userId) {
			return null
		}

		const player = await ctx.db
			.query("players")
			.withIndex("userId_worldId", (q) =>
				q.eq("userId", userId).eq("worldId", world._id),
			)
			.unique()

		const character =
			player?.currentCharacterId &&
			(await ctx.db.get(player.currentCharacterId))

		const location = character && (await ctx.db.get(character.locationId))

		return {
			world,
			character,
			location,
			prompt: player?.currentPrompt,
		}
	},
})

export const update = internalMutation({
	args: {
		id: v.id("worlds"),
		name: v.optional(v.string()),
	},
	handler: async (ctx, { id, ...args }) => {
		await ctx.db.patch(id, args)
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

export const onboard = mutation({
	args: {
		name: v.string(),
		pronouns: v.string(),
		description: v.string(),
		location: v.string(),
		time: v.string(),
		worldId: v.id("worlds"),
	},
	async handler(ctx, { worldId, ...args }) {
		const userId = await ensureAuthUserId(ctx)

		const locationId = await ctx.db.insert("locations", {
			name: args.location,
			properties: {},
			worldId,
		})

		const characterId = await ctx.db.insert("characters", {
			name: args.name,
			pronouns: args.pronouns,
			properties: {},
			worldId,
			locationId,
		})

		const player = await getPlayer(ctx, userId, worldId)

		if (!player) {
			await ctx.db.insert("players", {
				userId,
				worldId,
				currentCharacterId: characterId,
			})
		} else {
			await ctx.db.patch(player._id, {
				currentCharacterId: characterId,
			})
		}
	},
})
