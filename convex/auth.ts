import Discord from "@auth/core/providers/discord"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import { Auth } from "convex/server"
import { ConvexError, v } from "convex/values"
import { api } from "./_generated/api"
import { Doc } from "./_generated/dataModel"
import { ActionCtx, mutation, query, QueryCtx } from "./_generated/server"

export const { auth, signIn, signOut, store } = convexAuth({
	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
		}),
	],
})

export const user = query({
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
		"db" in ctx ? await ctx.db.get(userId) : await ctx.runQuery(api.auth.user)
	if (!user) {
		throw new ConvexError(`User doc for id "${userId}" not found`)
	}
	return user
}
