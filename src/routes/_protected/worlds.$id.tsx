import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/worlds/$id")({
	component: WorldRouteComponent,
})

function WorldRouteComponent() {
	const params = Route.useParams()
	const world = useSuspenseQuery(
		convexQuery(api.worlds.get, { id: params.id as Id<"worlds"> }),
	)

	if (!world.data) {
		return <p>World not found</p>
	}

	return (
		<PageLayout title={`Welcome to ${world.data.name}`}>content</PageLayout>
	)
}
