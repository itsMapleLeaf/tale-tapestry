import { ConvexError } from "convex/values"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"

export async function createTextCompletion(options: {
	apiKey: string | undefined
	model: string
	systemMessage?: string
	userMessage?: string
}) {
	const openai = setupOpenAI(options.apiKey)
	const completion = await openai.chat.completions.create(
		getClientOptions(options),
	)

	const result = completion.choices[0]?.message.content
	if (!result) {
		throw new ConvexError("Completion message content not found")
	}
	return result
}

export async function createParsedCompletion<
	Schema extends z.ZodType,
>(options: {
	apiKey: string | undefined
	model: string
	systemMessage?: string
	userMessage?: string
	schema: Schema
}) {
	const openai = setupOpenAI(options.apiKey)

	const completion = await openai.beta.chat.completions.parse({
		...getClientOptions(options),
		response_format: zodResponseFormat(options.schema, "response"),
		provider: {
			require_parameters: true,
		},
	})

	const result = completion.choices[0]?.message.parsed
	if (!result) {
		throw new ConvexError("Parsed message result not found")
	}
	return result
}

function setupOpenAI(apiKey: string | undefined) {
	if (!apiKey) {
		throw new ConvexError("No API key set")
	}

	return new OpenAI({
		baseURL: "https://openrouter.ai/api/v1",
		apiKey,
		fetch: async (...args) => {
			console.debug("[promptAi]", ...args)
			const res = await fetch(...args)
			console.debug(await res.clone().json())
			return res
		},
	})
}

function getClientOptions({
	model,
	systemMessage,
	userMessage,
}: {
	model: string
	systemMessage?: string
	userMessage?: string
}) {
	const messages: ChatCompletionMessageParam[] = []

	if (systemMessage) {
		messages.push({
			role: "system",
			content: systemMessage,
		})
	}

	if (userMessage) {
		messages.push({
			role: "user",
			content: userMessage,
		})
	}

	return { model, messages }
}
