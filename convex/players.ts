import { ConvexError } from "convex/values"
import { Id } from "./_generated/dataModel"
import { QueryCtx } from "./_generated/server"

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

export async function ensurePlayer(
	ctx: QueryCtx,
	userId: Id<"users">,
	worldId: Id<"worlds">,
) {
	const player = await getPlayer(ctx, userId, worldId)
	if (!player) {
		throw new ConvexError({ message: "Player not found", userId, worldId })
	}
	return player
}
