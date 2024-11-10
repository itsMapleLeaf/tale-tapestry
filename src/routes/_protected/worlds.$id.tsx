import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LucidePlay } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "../../components/Button.tsx"
import { InputForm } from "../../components/InputForm.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { Onboarding } from "../../components/Onboarding.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/worlds/$id")({
	component: WorldRouteComponent,
})

function WorldRouteComponent() {
	const params = Route.useParams()
	const worldId = params.id as Id<"worlds">
	const query = useSuspenseQuery(convexQuery(api.worlds.get, { id: worldId }))
	const createPrompt = useMutation({
		mutationFn: useConvexMutation(api.prompts.create),
	})

	if (!query.data) {
		return <p>World not found</p>
	}

	const { world, character, location, prompt } = query.data

	return (
		<PageLayout title={`Welcome to ${world.name}.`}>
			{character == null || location == null ? (
				<Onboarding worldId={worldId} />
			) : prompt == null ? (
				<form action={() => createPrompt.mutate({ worldId })}>
					<Button type="submit" icon={<LucidePlay />}>
						Start
					</Button>
				</form>
			) : (
				<div className="flex flex-col gap-4">
					<p className="whitespace-pre-line">{prompt.message}</p>
					{prompt.pending ? (
						<LoadingIcon />
					) : (
						<InputForm
							placeholder="Do something..."
							action={() => createPrompt.mutate({ worldId })}
						/>
					)}
				</div>
			)}
		</PageLayout>
	)
}
