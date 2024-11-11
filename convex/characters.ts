import { getManyFrom, getOrThrow } from "convex-helpers/server/relationships"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import schema from "./schema.ts"
import { ensureViewerWorldAccess } from "./worlds.ts"

export const create = mutation({
	args: {
		...schema.tables.characters.validator.fields,
	},
	handler: async (ctx, args) => {
		await ensureViewerWorldAccess(ctx, args.worldId)
		return await ctx.db.insert("characters", args)
	},
})

export const listByWorld = query({
	args: { worldId: v.id("worlds") },
	handler: async (ctx, { worldId }) => {
		await ensureViewerWorldAccess(ctx, worldId)
		return await getManyFrom(ctx.db, "characters", "worldId", worldId)
	},
})

export const listByLocation = query({
	args: { locationId: v.id("locations") },
	handler: async (ctx, { locationId }) => {
		const location = await getOrThrow(ctx, locationId)
		await ensureViewerWorldAccess(ctx, location.worldId)
		return await getManyFrom(ctx.db, "characters", "locationId", locationId)
	},
})

export const get = query({
	args: { characterId: v.id("characters") },
	handler: async (ctx, { characterId }) => {
		const character = await getOrThrow(ctx, characterId)
		await ensureViewerWorldAccess(ctx, character.worldId)
		return character
	},
})
