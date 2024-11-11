import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	...authTables,

	users: defineTable({
		...authTables.users.validator.fields,
		name: v.string(),
		openRouterApiKey: v.optional(v.string()),
	}).index("email", ["email"]),

	worlds: defineTable({
		name: v.string(),
		creatorId: v.id("users"),
	}).index("creatorId", ["creatorId"]),

	players: defineTable({
		userId: v.id("users"),
		worldId: v.id("worlds"),
	})
		.index("worldId", ["worldId"])
		.index("userId_worldId", ["userId", "worldId"]),

	locations: defineTable({
		name: v.string(),
		properties: v.record(v.string(), v.string()),
		worldId: v.id("worlds"),
	}).index("worldId", ["worldId"]),

	characters: defineTable({
		name: v.string(),
		pronouns: v.string(),
		properties: v.record(v.string(), v.string()),
		worldId: v.id("worlds"),
		locationId: v.id("locations"),
	})
		.index("worldId", ["worldId"])
		.index("locationId", ["locationId"]),

	prompts: defineTable({
		content: v.string(),
		actions: v.array(v.object({ name: v.string() })),
		characterId: v.id("characters"),
		status: v.union(
			v.literal("pending"),
			v.literal("success"),
			v.literal("failure"),
		),
	}).index("characterId", ["characterId"]),
})
