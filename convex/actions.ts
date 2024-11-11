import { nullable } from "convex-helpers/validators"
import { ConvexError, Value, v } from "convex/values"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"
import { pick } from "../src/lib/object.ts"
import { api, internal } from "./_generated/api"
import { action } from "./_generated/server"
import { worldMutationInputSchema } from "./mutations.ts"
import { ensureApiKey, ensureAuthUser } from "./users.ts"

export const create = action({
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

		const currentWorldState = {
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
				content: `The user is playing in an evolving world simulation. They make actions in this world by responding to action prompts created by you.

				When describing the scene, please ensure the following:
				- Write in second person from the perspective of their character.
				- Add things for them to interact with.
				- Mention locations and other entities using the correct possessive nouns. For example: if a location is called "Allison's Library", and the player is playing Allison, call it "your library".
				- Mention adjacent locations or characters that could theoretically exist here, even if they aren't in the world state.
				- Write in beige prose. Use concrete everyday words with their literal meaning.
				- Be specific.
				- Use colloquial dialog.
				- Respond with a few short paragraphs no longer than 100 words.
				- Use lots of line breaks for readability.
				- Avoid transitional statements like "what will you do next" or "adventures await".
				`,
			},
			{
				role: "system",
				content: `Current world state: ${JSON.stringify(currentWorldState)}`,
			},
		]

		actionPromptMessages.push({
			role: "user",
			content: `What's currently around me?`,
		})

		if (latestPrompt) {
			actionPromptMessages.push({
				role: "assistant",
				content: latestPrompt.content,
			})
			if (action) {
				actionPromptMessages.push({
					role: "user",
					content: `Here's what I would like to do: ${action}`,
				})
			}
		}

		let actionPrompt = ""
		try {
			const completion = await openai.chat.completions.create({
				// model: "microsoft/wizardlm-2-8x22b",
				// model: "microsoft/wizardlm-2-7b",
				model: "nousresearch/hermes-3-llama-3.1-405b",
				// model: "nousresearch/hermes-3-llama-3.1-70b",
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
		} catch (error) {
			console.error(error)
			await ctx.runMutation(internal.prompts.update, {
				promptId,
				status: "failure",
			})
			return
		}

		try {
			const mutationCompletion = await openai.beta.chat.completions
				.parse({
					// model: "microsoft/wizardlm-2-8x22b",
					// model: "microsoft/wizardlm-2-7b",
					// model: "nousresearch/hermes-3-llama-3.1-405b",
					// model: "nousresearch/hermes-3-llama-3.1-70b",
					// model: "openai/gpt-4o-mini-2024-07-18",
					model: "openai/gpt-4o-2024-08-06",
					messages: [
						...actionPromptMessages,
						{
							role: "assistant",
							content: actionPrompt,
						},
						{
							role: "user",
							content: `Based on the scene, what changes need to be made to the world state? Return an array of mutations that would update the world to match the scene.

							Available mutation types:
							- createCharacter: Record the existence of a character in the scene that's not in the world state. Always give the character a proper name, like "Liliac" instead of "Allison's Mom". If no name is mentioned in the source prompt, make one up.

							- createLocation: Record the existence of a location in the scene that's not in the world state

							- setWorldTime: Update the world's time

							- setCharacterLocation: Move a character to a new location. This should be very precise, to the level of rooms in a building, such as "Allison's Bedroom", "Amara's Study", or "The Kitchen of Lily's Cottage". If outside, name the specific area that they're in, such as a park, a garden, or a parking lot.

							- setCharacterPronouns: Update a character's pronouns

							- setProperty: Set a property on a character or location. If you want to set multiple properties, return multiple mutation objects. If several values would match the same key, combine their values in a flat comma-separated list. Do not use this to set a character's location.

							- removeProperty: Remove a property from a character or location when it no longer applies

							Be thorough and comprehensive. Derive any assumed information not already stated. For example: if a character is looking for their magic staff, that must mean they're a magician. This would become properties like "occupation: magician" and "magicExpertise: ice".

							Also look for things like the character's current goal, their mood, their exhaustion level, and anything else helpful to keep track of.

							Keep track of relations between characters as well. This could be done with properties like "siblings: Amelia, Rosemary", "mother: Hazel", and so on.

							Give new characters and locations unambiguous names. For example: when making a "Garden" location while in "Allison's House", the location should be called "Allison's Garden". Similarly, if we're in "Whisperwood Forest" and we find an oasis, it could be called "An Oasis in Whisperwood Forest".`,
						},
					],
					response_format: zodResponseFormat(
						z.object({
							mutations: z.array(worldMutationInputSchema),
						}),
						"mutationList",
					),
					provider: {
						require_parameters: true,
					},
				})
				.catch(console.error)

			const mutationList = mutationCompletion?.choices[0]?.message.parsed
			if (!mutationList) {
				throw new ConvexError({
					message: "No mutations given",
					stateUpdateCompletion: mutationCompletion as unknown as Value,
				})
			}

			function getRank(mutation: z.input<typeof worldMutationInputSchema>) {
				if (mutation.type === "createLocation") return 0
				if (mutation.type === "createCharacter") return 1
				return 9999
			}

			const sortedMutations = [...mutationList.mutations].sort(
				(a, b) => getRank(a) - getRank(b),
			)

			for (const mutation of sortedMutations) {
				console.debug("Applying mutation", mutation)
				try {
					await ctx.runMutation(internal.mutations.apply, {
						promptId,
						mutation,
						worldId: character.worldId,
					})
				} catch (error) {
					console.error("Failed to apply mutation", {
						error,
						mutation,
					})
				}
			}
		} catch (error) {
			console.error("Failed to update world state:", error)
		}

		await ctx.runMutation(internal.prompts.update, {
			promptId,
			status: "success",
		})
	},
})
