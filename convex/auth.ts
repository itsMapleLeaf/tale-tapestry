import Discord from "@auth/core/providers/discord"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"

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
		const userId = await getAuthUserId(ctx)
		if (!userId) {
			throw new ConvexError("Not logged in")
		}
		await ctx.db.patch(userId, args)
		return {
			...(await ctx.db.get(userId)),
			...args,
		}
	},
})
