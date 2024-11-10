import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Onboarding } from "../../components/Onboarding.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/worlds/$id")({
	component: WorldRouteComponent,
})

function WorldRouteComponent() {
	const params = Route.useParams()
	const worldId = params.id as Id<"worlds">
	const query = useSuspenseQuery(convexQuery(api.worlds.get, { id: worldId }))

	if (!query.data) {
		return <p>World not found</p>
	}

	const { world, character, location } = query.data

	return (
		<PageLayout title={`Welcome to ${world.name}.`}>
			{character == null || location == null ? (
				<Onboarding worldId={worldId} />
			) : (
				<p>hello, {character.name}!</p>
			)}
		</PageLayout>
	)
}
