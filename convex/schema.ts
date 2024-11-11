import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const worldMutationValidator = v.union(
	v.object({
		type: v.literal("setWorldTime"),
		worldId: v.id("worlds"),
		worldName: v.string(),
		time: v.string(),
	}),
	v.object({
		type: v.literal("setProperty"),
		entity: v.union(
			v.object({
				type: v.literal("character"),
				id: v.id("characters"),
				name: v.string(),
			}),
			v.object({
				type: v.literal("location"),
				id: v.id("locations"),
				name: v.string(),
			}),
		),
		key: v.string(),
		value: v.string(),
	}),
	v.object({
		type: v.literal("removeProperty"),
		entity: v.union(
			v.object({
				type: v.literal("character"),
				id: v.id("characters"),
				name: v.string(),
			}),
			v.object({
				type: v.literal("location"),
				id: v.id("locations"),
				name: v.string(),
			}),
		),
		key: v.string(),
	}),
	v.object({
		type: v.literal("setCharacterLocation"),
		characterId: v.id("characters"),
		characterName: v.string(),
		locationId: v.id("locations"),
		locationName: v.string(),
	}),
	v.object({
		type: v.literal("setCharacterPronouns"),
		characterId: v.id("characters"),
		characterName: v.string(),
		pronouns: v.string(),
	}),
	v.object({
		type: v.literal("createCharacter"),
		characterId: v.id("characters"),
		characterName: v.string(),
		pronouns: v.string(),
		locationId: v.id("locations"),
		locationName: v.string(),
	}),
	v.object({
		type: v.literal("createLocation"),
		locationId: v.id("locations"),
		locationName: v.string(),
	}),
)

export default defineSchema({
	...authTables,

	users: defineTable({
		...authTables.users.validator.fields,
		name: v.string(),
		openRouterApiKey: v.optional(v.string()),
	}).index("email", ["email"]),

	worlds: defineTable({
		name: v.string(),
		time: v.optional(v.string()),
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
	})
		.index("worldId", ["worldId"])
		.searchIndex("search_name", {
			searchField: "name",
			filterFields: ["worldId"],
		}),

	characters: defineTable({
		name: v.string(),
		pronouns: v.string(),
		properties: v.record(v.string(), v.string()),
		worldId: v.id("worlds"),
		locationId: v.id("locations"),
	})
		.index("worldId", ["worldId"])
		.index("locationId", ["locationId"])
		.searchIndex("search_name", {
			searchField: "name",
			filterFields: ["worldId"],
		}),

	prompts: defineTable({
		content: v.string(),
		actions: v.array(v.object({ name: v.string() })),
		characterId: v.id("characters"),
		status: v.union(
			v.literal("pending"),
			v.literal("success"),
			v.literal("failure"),
		),
		mutations: v.optional(v.array(worldMutationValidator)),
	}).index("characterId", ["characterId"]),
})
