import { ConvexError, v } from "convex/values"
import OpenAI from "openai"
import { internal } from "./_generated/api"
import { internalAction, mutation } from "./_generated/server"
import { ensureAuthUser } from "./auth.ts"
import { getPlayer } from "./players.ts"

export const create = mutation({
	args: {
		worldId: v.id("worlds"),
	},
	handler: async (ctx, { worldId }) => {
		const user = await ensureAuthUser(ctx)
		if (!user.openRouterApiKey) {
			throw new ConvexError({
				message: "No OpenAPI auth key set",
				user: { id: user._id, name: user.name },
			})
		}

		const world = await ctx.db.get(worldId)
		if (!world) {
			throw new ConvexError({
				message: "World not found",
				worldId,
			})
		}

		const player = await getPlayer(ctx, user._id, worldId)
		if (!player) {
			throw new ConvexError({
				message: "Player not found",
				worldId,
				user,
			})
		}

		if (!player.currentCharacterId) {
			throw new ConvexError({
				message: "Character not set",
				player,
			})
		}

		const character = await ctx.db.get(player.currentCharacterId)
		if (!character) {
			throw new ConvexError({
				message: "Character not found",
				characterId: player.currentCharacterId,
			})
		}

		const location = await ctx.db.get(character.locationId)
		if (!location) {
			throw new ConvexError({
				message: "Location not found",
				locationId: character.locationId,
			})
		}

		const currentPrompt = player?.currentPrompt ?? {
			message: "",
			actions: [],
			pending: false,
		}

		if (currentPrompt.pending) {
			return
		}

		let playerId
		if (!player) {
			playerId = await ctx.db.insert("players", {
				userId: user._id,
				worldId,
				currentPrompt: {
					message: "",
					actions: [],
					pending: true,
				},
			})
		} else {
			await ctx.db.patch(player._id, {
				currentPrompt: {
					message: "",
					actions: [],
					pending: true,
				},
			})
			playerId = player._id
		}

		await ctx.scheduler.runAfter(0, internal.prompts.populate, {
			apiKey: user.openRouterApiKey,
			playerId,
			world: { name: world.name },
			character: {
				name: character.name,
				pronouns: character.pronouns,
				properties: character.properties,
			},
			location: {
				name: location.name,
				properties: location.properties,
			},
		})
	},
})

export const populate = internalAction({
	args: {
		apiKey: v.string(),
		playerId: v.id("players"),
		world: v.object({
			name: v.string(),
		}),
		location: v.object({
			name: v.string(),
			properties: v.record(v.string(), v.string()),
		}),
		character: v.object({
			name: v.string(),
			pronouns: v.string(),
			properties: v.record(v.string(), v.string()),
		}),
	},
	handler: async (ctx, { apiKey, playerId, world, location, character }) => {
		let message = ""
		try {
			const openai = new OpenAI({
				baseURL: "https://openrouter.ai/api/v1",
				apiKey,
			})

			const completion = await openai.chat.completions.create({
				model: "nousresearch/hermes-3-llama-3.1-70b",
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
					message += content
					await ctx.runMutation(internal.players.update, {
						playerId,
						currentPrompt: {
							message,
							actions: [],
							pending: true,
						},
					})
				}
			}
		} finally {
			await ctx.runMutation(internal.players.update, {
				playerId,
				currentPrompt: {
					message,
					actions: [],
					pending: false,
				},
			})
		}
	},
})
