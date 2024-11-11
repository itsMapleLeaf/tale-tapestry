import { getManyFrom, getOrThrow } from "convex-helpers/server/relationships"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import schema from "./schema.ts"
import { ensureViewerWorldAccess } from "./worlds.ts"

export const create = mutation({
	args: {
		...schema.tables.locations.validator.fields,
	},
	handler: async (ctx, args) => {
		await ensureViewerWorldAccess(ctx, args.worldId)
		return await ctx.db.insert("locations", args)
	},
})

export const list = query({
	args: { worldId: v.id("worlds") },
	handler: async (ctx, { worldId }) => {
		try {
			await ensureViewerWorldAccess(ctx, worldId)
			return await getManyFrom(ctx.db, "locations", "worldId", worldId)
		} catch (error) {
			console.warn(error)
			return []
		}
	},
})

export const get = query({
	args: { locationId: v.id("locations") },
	handler: async (ctx, { locationId }) => {
		try {
			const location = await getOrThrow(ctx, locationId)
			await ensureViewerWorldAccess(ctx, location.worldId)
			return location
		} catch (error) {
			console.warn(error)
			return null
		}
	},
})
