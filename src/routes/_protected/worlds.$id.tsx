import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/worlds/$id")({
	component: WorldRouteComponent,
})

function WorldRouteComponent() {
	const params = Route.useParams()
	const world = useQuery(
		convexQuery(api.worlds.get, { id: params.id as Id<"worlds"> }),
	)

	if (world.error) {
		return (
			<>
				<p>Failed to load world</p>
				<pre>{world.error.message}</pre>
			</>
		)
	}

	if (!world.data) {
		return <LoadingIcon />
	}

	return (
		<PageLayout title={`Welcome to ${world.data.name}`}>content</PageLayout>
	)
}
