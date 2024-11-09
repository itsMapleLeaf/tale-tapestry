import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LucideSend } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Button } from "../../components/Button.tsx"
import { Input } from "../../components/Input.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"

export const Route = createFileRoute("/_protected/")({
	component: Home,
})

function Home() {
	const createPrompt = useMutation({
		mutationFn: useConvexMutation(api.prompts.create),
	})

	const prompts = useQuery(convexQuery(api.prompts.list, {}))

	return (
		<>
			<form
				action={(formData) => {
					createPrompt.mutate({
						message: formData.get("message") as string,
					})
				}}
				className="flex gap-2"
			>
				<Input name="message" className="flex-1" />
				<Button
					type="submit"
					icon={<LucideSend />}
					pending={createPrompt.isPending}
				>
					Send
				</Button>
			</form>
			{prompts.data?.map((prompt) => (
				<div className="bg-primary-900 border-primary-800 mt-2 rounded border px-3 py-2">
					<p className="text-primary-100 border-primary-800 mb-2 border-l-4 pl-2 whitespace-pre-line">
						{prompt.message}
					</p>
					<p className="whitespace-pre-line">{prompt.response}</p>
					{prompt.pending && <LoadingIcon />}
				</div>
			))}
		</>
	)
}
