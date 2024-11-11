import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { intlFormatDistance } from "date-fns"
import { LucideGlobe, LucidePlus } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Button } from "../../components/Button.tsx"
import { ListCard } from "../../components/ListCard.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/")({
	component: Home,
})

function Home() {
	const worlds = useSuspenseQuery(convexQuery(api.worlds.list, {}))
	return (
		<PageLayout title="Choose a world">
			<div className="vstack">
				{worlds.data.map((world) => (
					<Link
						key={world._id}
						to="/worlds/$world"
						params={{ world: world._id }}
						className="w-full"
					>
						<ListCard
							className="panel-interactive"
							title={world.name}
							description={`created ${intlFormatDistance(world._creationTime, Date.now())}`}
							icon={<LucideGlobe />}
						/>
					</Link>
				))}
				<Button
					icon={<LucidePlus />}
					className="self-start"
					render={<Link to="/worlds/new" />}
				>
					Create a new world
				</Button>
			</div>
		</PageLayout>
	)
}
