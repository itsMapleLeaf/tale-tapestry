import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { QueryCtx, internalMutation } from "./_generated/server"

export const update = internalMutation({
	args: {
		playerId: v.id("players"),
		currentCharacterId: v.optional(v.union(v.id("characters"), v.null())),
		currentPrompt: v.optional(
			v.object({
				pending: v.boolean(),
				message: v.string(),
				actions: v.array(v.string()),
			}),
		),
	},
	handler: async (ctx, { playerId, ...args }) => {
		await ctx.db.patch(playerId, args)
	},
})

export async function getPlayer(
	ctx: QueryCtx,
	userId: Id<"users">,
	worldId: Id<"worlds">,
) {
	return await ctx.db
		.query("players")
		.withIndex("userId_worldId", (q) =>
			q.eq("userId", userId).eq("worldId", worldId),
		)
		.unique()
}
