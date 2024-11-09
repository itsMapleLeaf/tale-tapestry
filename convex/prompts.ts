import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, mutation, query } from "./_generated/server"
import { ensureAuthUser } from "./auth.ts"

export const create = mutation({
	args: {
		message: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ensureAuthUser(ctx)

		if (!user.openRouterApiKey) {
			throw new ConvexError({
				message: "No OpenAPI auth key set",
				user: { id: user._id, name: user.name },
			})
		}

		const message = args.message.trim()
		if (!message) {
			throw new ConvexError({
				message: "Message is empty",
			})
		}

		const id = await ctx.db.insert("prompts", {
			userId: user._id,
			message: args.message,
			response: "",
			pending: true,
		})

		await ctx.scheduler.runAfter(0, internal.prompts.actions.populate, {
			apiKey: user.openRouterApiKey,
			message,
			promptId: id,
		})

		return id
	},
})

export const list = query({
	handler: async (ctx) => {
		const user = await ensureAuthUser(ctx)

		return await ctx.db
			.query("prompts")
			.withIndex("userId")
			.filter((q) => q.eq(q.field("userId"), user._id))
			.collect()
	},
})

export const get = query({
	args: { id: v.id("prompts") },
	handler: async (ctx, args) => {
		const user = await ensureAuthUser(ctx)
		const prompt = await ctx.db.get(args.id)

		if (!prompt || prompt.userId !== user._id) {
			return null
		}

		return prompt
	},
})

export const update = internalMutation({
	args: {
		id: v.id("prompts"),
		message: v.optional(v.string()),
		response: v.optional(v.string()),
		pending: v.optional(v.boolean()),
	},
	handler: async (ctx, { id, ...args }) => {
		await ctx.db.patch(id, args)
	},
})

export const remove = mutation({
	args: { id: v.id("prompts") },
	handler: async (ctx, args) => {
		const user = await ensureAuthUser(ctx)
		const existing = await ctx.db.get(args.id)

		if (!existing) {
			throw new ConvexError({ message: "Prompt not found", promptId: args.id })
		}

		if (existing.userId !== user._id) {
			throw new ConvexError({
				message: "Not authorized to delete this prompt",
				promptId: args.id,
				userId: user._id,
				promptUserId: existing.userId,
			})
		}

		await ctx.db.delete(args.id)
	},
})
