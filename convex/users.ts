import { getAuthUserId } from "@convex-dev/auth/server"
import { Auth } from "convex/server"
import { ConvexError, v } from "convex/values"
import { api } from "./_generated/api"
import { Doc } from "./_generated/dataModel"
import { ActionCtx, QueryCtx, mutation, query } from "./_generated/server"

export const me = query({
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx)
		return userId && (await ctx.db.get(userId))
	},
})

export const update = mutation({
	args: {
		openRouterApiKey: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await ensureAuthUserId(ctx)
		await ctx.db.patch(userId, args)
		return {
			...(await ctx.db.get(userId)),
			...args,
		}
	},
})

export async function ensureAuthUserId(ctx: { auth: Auth }) {
	const userId = await getAuthUserId(ctx)
	if (!userId) {
		throw new ConvexError("Not logged in")
	}
	return userId
}

export async function ensureAuthUser(
	ctx: QueryCtx | ActionCtx,
): Promise<Doc<"users">> {
	const userId = await ensureAuthUserId(ctx)
	const user =
		"db" in ctx ? await ctx.db.get(userId) : await ctx.runQuery(api.users.me)
	if (!user) {
		throw new ConvexError(`User doc for id "${userId}" not found`)
	}
	return user
}

export async function ensureApiKey(user: Doc<"users">) {
	if (!user.openRouterApiKey) {
		throw new ConvexError({
			message: "No OpenAPI auth key set",
			user: { id: user._id, name: user.name },
		})
	}
	return user.openRouterApiKey
}
