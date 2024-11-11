import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { intlFormatDistance } from "date-fns"
import { LucideUserCircle2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { ListCard } from "../../components/ListCard.tsx"
import { Onboarding } from "../../components/Onboarding.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/worlds/$world/")({
	component: WorldRouteComponent,
})

function WorldRouteComponent() {
	const params = Route.useParams()
	const worldId = params.world as Id<"worlds">

	const { data: world } = useSuspenseQuery(
		convexQuery(api.worlds.get, { worldId }),
	)

	const { data: characters } = useSuspenseQuery(
		convexQuery(api.characters.list, { worldId }),
	)

	if (!world) {
		return <p>World not found</p>
	}

	return (
		<PageLayout title={`Welcome to ${world.name}.`}>
			{characters.length === 0 ? (
				<Onboarding worldId={worldId} />
			) : (
				<div className="vstack">
					{characters.map((character) => (
						<Link
							key={character._id}
							to="/worlds/$world/characters/$character"
							params={{ world: world._id, character: character._id }}
							className="w-full"
						>
							<ListCard
								className="panel-interactive"
								title={character.name}
								description={`created ${intlFormatDistance(character._creationTime, Date.now())}`}
								icon={<LucideUserCircle2 />}
							/>
						</Link>
					))}
				</div>
			)}
		</PageLayout>
	)
}
