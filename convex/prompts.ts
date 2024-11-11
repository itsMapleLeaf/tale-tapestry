import { getOrThrow } from "convex-helpers/server/relationships"
import { partial } from "convex-helpers/validators"
import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"
import schema from "./schema.ts"
import { ensureViewerWorldAccess } from "./worlds.ts"

export const list = query({
	args: {
		characterId: v.id("characters"),
	},
	handler: async (ctx, { characterId }) => {
		const character = await getOrThrow(ctx, characterId)
		await ensureViewerWorldAccess(ctx, character.worldId)
		return await ctx.db
			.query("prompts")
			.withIndex("characterId", (q) => q.eq("characterId", characterId))
			.collect()
	},
})

export const getLatest = query({
	args: {
		characterId: v.id("characters"),
	},
	handler: async (ctx, { characterId }) => {
		return await ctx.db
			.query("prompts")
			.withIndex("characterId", (q) => q.eq("characterId", characterId))
			.order("desc")
			.first()
	},
})

export const create = internalMutation({
	args: {
		...schema.tables.prompts.validator.fields,
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("prompts", args)
	},
})

export const update = internalMutation({
	args: {
		...partial(schema.tables.prompts.validator.fields),
		promptId: v.id("prompts"),
	},
	handler: async (ctx, { promptId, ...args }) => {
		await ctx.db.patch(promptId, args)
	},
})
