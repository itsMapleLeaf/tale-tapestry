import { getManyFrom, getOrThrow } from "convex-helpers/server/relationships"
import { nullable } from "convex-helpers/validators"
import { ConvexError, v } from "convex/values"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"
import { pick } from "../src/lib/object.ts"
import { api, internal } from "./_generated/api"
import { action, mutation, query } from "./_generated/server"
import schema from "./schema.ts"
import { ensureApiKey, ensureAuthUser } from "./users.ts"
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

export const list = query({
	args: { worldId: v.id("worlds") },
	handler: async (ctx, { worldId }) => {
		await ensureViewerWorldAccess(ctx, worldId)
		return await getManyFrom(ctx.db, "characters", "worldId", worldId)
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

export const act = action({
	args: {
		characterId: v.id("characters"),
		action: nullable(v.string()),
	},
	handler: async (ctx, { characterId, action }) => {
		const user = await ensureAuthUser(ctx)
		const apiKey = await ensureApiKey(user)
		const character = await ctx.runQuery(api.characters.get, {
			characterId,
		})
		const world = await ctx.runQuery(api.worlds.get, {
			worldId: character.worldId,
		})
		const location = await ctx.runQuery(api.locations.get, {
			locationId: character.locationId,
		})
		const latestPrompt = await ctx.runQuery(api.prompts.getLatest, {
			characterId,
		})

		if (latestPrompt?.status === "pending") {
			throw new ConvexError("Current prompt is still pending")
		}

		let promptId
		if (latestPrompt?.status === "failure") {
			promptId = latestPrompt._id
			await ctx.runMutation(internal.prompts.update, {
				promptId: latestPrompt._id,
				status: "pending",
			})
		} else {
			promptId = await ctx.runMutation(internal.prompts.create, {
				characterId: character._id,
				content: "",
				actions: [],
				status: "pending",
			})
		}

		const openai = new OpenAI({
			baseURL: "https://openrouter.ai/api/v1",
			apiKey,
		})

		const state = {
			world: pick(world, ["name", "time"]),
			player: {
				character: {
					...pick(character, ["name", "pronouns", "properties"]),
				},
			},
			currentLocation: pick(location, ["name", "properties"]),
			otherCharactersPresent: [],
		}

		const actionPromptMessages: ChatCompletionMessageParam[] = [
			{
				role: "system",
				content: `The user is playing in an evolving world simulation. They make actions in this world by responding to action prompts created by you.`,
			},
			{
				role: "system",
				content: `Current world state: ${JSON.stringify(state)}`,
			},
		]

		if (latestPrompt) {
			actionPromptMessages.push({
				role: "assistant",
				content: latestPrompt.content,
			})
			if (action) {
				actionPromptMessages.push({
					role: "user",
					content: `Here's what I'll choose to do: ${action}`,
				})
			}
		}

		actionPromptMessages.push({
			role: "user",
			content: `What's currently around me? Write in second person from the perspective of my character. Add things for me to interact with. Mention adjacent locations or characters that could theoretically exist here, even if they aren't in the world state. Don't make my character act for me, like speaking or walking someplace. Respond with a few short paragraphs no longer than 100 words. Use lots of line breaks for readability.`,
		})

		let actionPrompt = ""
		try {
			const completion = await openai.chat.completions.create({
				// model: "microsoft/wizardlm-2-8x22b",
				// model: "microsoft/wizardlm-2-7b",
				// model: "nousresearch/hermes-3-llama-3.1-405b",
				model: "nousresearch/hermes-3-llama-3.1-70b",
				messages: actionPromptMessages,
				stream: true,
			})

			for await (const chunk of completion) {
				const content = chunk.choices[0]?.delta.content
				if (content) {
					actionPrompt += content
					await ctx.runMutation(internal.prompts.update, {
						promptId,
						content: actionPrompt,
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
			return
		}

		const stateUpdateCompletion = await openai.beta.chat.completions
			.parse({
				// model: "microsoft/wizardlm-2-8x22b",
				// model: "microsoft/wizardlm-2-7b",
				// model: "nousresearch/hermes-3-llama-3.1-405b",
				// model: "nousresearch/hermes-3-llama-3.1-70b",
				model: "openai/gpt-4o-mini-2024-07-18",
				messages: [
					...actionPromptMessages,
					{
						role: "assistant",
						content: actionPrompt,
					},
					{
						role: "user",
						content: `Alright, now create an updated world state. Between the current world state and the current scene, include anything added or changed. For properties, don't repeat keys. If a key could have multiple values, combine them under a single key, separated by commas.`,
					},
				],
				response_format: zodResponseFormat(
					z.object({
						characters: z.array(
							z.object({
								name: z.string(),
								pronouns: z.string(),
								properties: z.array(
									z.object({ key: z.string(), value: z.string() }),
								),
							}),
						),
						locations: z.array(
							z.object({
								name: z.string(),
								properties: z.array(
									z.object({ key: z.string(), value: z.string() }),
								),
							}),
						),
						world: z.object({
							time: z.string(),
						}),
					}),
					"stateUpdate",
				),
				provider: {
					require_parameters: true,
				},
			})
			.catch(console.error)

		console.log(stateUpdateCompletion?.choices[0]?.message.parsed)
		console.log(stateUpdateCompletion)
	},
})
