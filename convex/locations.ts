import { getManyFrom, getOrThrow } from "convex-helpers/server/relationships"
import { v } from "convex/values"
import { query } from "./_generated/server"
import { ensureViewerWorldAccess } from "./worlds.ts"

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
