import { ConvexError, v } from "convex/values"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { action, internalMutation, mutation, query } from "./_generated/server"
import { ensureAuthUser, ensureAuthUserId } from "./auth.ts"

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

		const openai = new OpenAI({
			baseURL: "https://openrouter.ai/api/v1",
			apiKey: user.openRouterApiKey!,
			fetch: async (...args) => {
				console.debug("suggestNames", ...args)
				const res = await fetch(...args)
				console.debug(await res.clone().json())
				return res
			},
		})

		const completion = await openai.beta.chat.completions.parse({
			model: "openai/gpt-4o-mini-2024-07-18",
			messages: [
				{
					role: "system",
					content:
						"Your job is to generate suggestions for the user to create their content.",
				},
				{
					role: "user",
					content: `Generate a list of 20 unique name suggestions for a fictional world with the theme "${args.theme}".`,
				},
			],
			response_format: zodResponseFormat(
				z.object({ suggestions: z.string().array() }),
				"suggestionList",
			),
			provider: {
				require_parameters: true,
			},
		})

		return completion.choices[0]?.message.parsed
	},
})
