import { getOrThrow } from "convex-helpers/server/relationships"
import { partial } from "convex-helpers/validators"
import { ConvexError, v } from "convex/values"
import OpenAI from "openai"
import { internal } from "./_generated/api"
import { Doc, Id } from "./_generated/dataModel"
import {
	internalAction,
	internalMutation,
	mutation,
	query,
} from "./_generated/server"
import schema from "./schema.ts"
import { ensureApiKey, ensureAuthUser } from "./users.ts"
import { ensureViewerWorldAccess } from "./worlds.ts"

export const create = mutation({
	args: {
		characterId: v.id("characters"),
	},
	handler: async (ctx, { characterId }) => {
		const user = await ensureAuthUser(ctx)
		const apiKey = await ensureApiKey(user)
		const character = await getOrThrow(ctx, characterId)
		const world = await getOrThrow(ctx, character.worldId)
		const location = await getOrThrow(ctx, character.locationId)

		const latestPrompt = await ctx.db
			.query("prompts")
			.withIndex("characterId", (q) => q.eq("characterId", characterId))
			.order("desc")
			.first()

		if (latestPrompt?.status === "pending") {
			throw new ConvexError("Current prompt is still pending")
		}

		let promptId
		if (latestPrompt?.status === "failure") {
			promptId = latestPrompt._id
			await ctx.db.patch(latestPrompt._id, {
				status: "pending",
			})
		} else {
			promptId = await ctx.db.insert("prompts", {
				characterId: character._id,
				content: "",
				actions: [],
				status: "pending",
			})
		}

		await ctx.scheduler.runAfter(0, internal.prompts.populate, {
			promptId,
			apiKey,
			world,
			character,
			location,
		})
	},
})

export const list = query({
	args: {
		characterId: v.id("characters"),
	},
	handler: async (ctx, { characterId }) => {
		try {
			const character = await getOrThrow(ctx, characterId)
			await ensureViewerWorldAccess(ctx, character.worldId)
			return await ctx.db
				.query("prompts")
				.withIndex("characterId", (q) => q.eq("characterId", characterId))
				.collect()
		} catch (error) {
			console.warn(error)
			return []
		}
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

export const populate = internalAction({
	handler: async (
		ctx,
		{
			promptId,
			apiKey,
			character,
			world,
			location,
		}: {
			promptId: Id<"prompts">
			apiKey: string
			world: Doc<"worlds">
			location: Doc<"locations">
			character: Doc<"characters">
		},
	) => {
		let response = ""
		try {
			const openai = new OpenAI({
				baseURL: "https://openrouter.ai/api/v1",
				apiKey,
			})

			const completion = await openai.chat.completions.create({
				model: "microsoft/wizardlm-2-7b",
				// model: "nousresearch/hermes-3-llama-3.1-405b",
				// model: "nousresearch/hermes-3-llama-3.1-70b",
				messages: [
					{
						role: "system",
						content: [
							`The user is playing in an evolving world simulation.`,
							`They make actions in this world by responding to action prompts created by you.`,
							``,
							`Here are the player's details and current state:`,
							JSON.stringify({ world, character, location }, null, "\t"),
							``,
							`First, describe the scenario with lots of flavorful details.`,
							``,
							`Then, ask what they want to do next, and give some bullet point suggestions for things they could do.`,
							``,
							`Finally: the world needs to update. With your response, include suggestions for...`,
							`- New characters`,
							`- New locations`,
							`- New or updated properties for each`,
							``,
							`Where properties can be anything. For characters, it could be their appearance, their mood, or their current goals. For locations, it can be how hot or cold they are, how crowded it is, or if there's something else going on.`,
						].join("\n\n"),
					},
				],
				stream: true,
			})

			for await (const chunk of completion) {
				const content = chunk.choices[0]?.delta.content
				if (content) {
					response += content
					await ctx.runMutation(internal.prompts.update, {
						promptId,
						content: response,
					})
				}
			}
			await ctx.runMutation(internal.prompts.update, {
				promptId,
				status: "success",
			})
		} catch (error) {
			console.error(error)
			await ctx.runMutation(internal.prompts.update, {
				promptId,
				status: "failure",
			})
		}
	},
})
