import { v } from "convex/values"
import OpenAI from "openai"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"

export const populate = internalAction({
	args: {
		promptId: v.id("prompts"),
		message: v.string(),
		apiKey: v.string(),
	},
	handler: async (ctx, { promptId, message, apiKey }) => {
		try {
			const openai = new OpenAI({
				baseURL: "https://openrouter.ai/api/v1",
				apiKey,
			})

			const completion = await openai.chat.completions.create({
				model: "nousresearch/hermes-3-llama-3.1-405b:free",
				messages: [{ role: "user", content: message }],
				stream: true,
			})

			let response = ""
			for await (const chunk of completion) {
				const content = chunk.choices[0]?.delta.content
				if (content) {
					response += content
					await ctx.runMutation(internal.prompts.update, {
						id: promptId,
						response,
					})
				}
			}
		} finally {
			await ctx.runMutation(internal.prompts.update, {
				id: promptId,
				pending: false,
			})
		}
	},
})
