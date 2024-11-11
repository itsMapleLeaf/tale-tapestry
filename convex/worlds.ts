import { getOrThrow } from "convex-helpers/server/relationships"
import { ConvexError, v } from "convex/values"
import { z } from "zod"
import { Id } from "./_generated/dataModel"
import {
	QueryCtx,
	action,
	internalMutation,
	mutation,
	query,
} from "./_generated/server"
import { createParsedCompletion } from "./ai.ts"
import { ensureAuthUser, ensureAuthUserId } from "./users.ts"

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
		await ensureViewerWorldAccess(ctx, worldId)

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
