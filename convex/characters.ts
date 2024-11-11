import { getManyFrom, getOrThrow } from "convex-helpers/server/relationships"
import { v } from "convex/values"
import { query } from "./_generated/server"
import { ensureViewerWorldAccess } from "./worlds.ts"

export const list = query({
	args: { worldId: v.id("worlds") },
	handler: async (ctx, { worldId }) => {
		try {
			await ensureViewerWorldAccess(ctx, worldId)
			return await getManyFrom(ctx.db, "characters", "worldId", worldId)
		} catch (error) {
			console.warn(error)
			return []
		}
	},
})

export const get = query({
	args: { characterId: v.id("characters") },
	handler: async (ctx, { characterId }) => {
		try {
			const character = await getOrThrow(ctx, characterId)
			await ensureViewerWorldAccess(ctx, character.worldId)
			return character
		} catch (error) {
			console.warn(error)
			return null
		}
	},
})
