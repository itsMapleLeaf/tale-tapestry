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
		creatorId: v.id("users"),
		name: v.string(),
	}).index("creatorId", ["creatorId"]),

	prompts: defineTable({
		userId: v.id("users"),
		message: v.string(),
		response: v.string(),
		pending: v.boolean(),
	}).index("userId", ["userId"]),
})
