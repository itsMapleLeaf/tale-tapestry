import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { intlFormatDistance } from "date-fns"
import { LucideGlobe, LucidePlus } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Button } from "../../components/Button.tsx"
import { ListCard } from "../../components/ListCard.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute("/_protected/")({
	component: Home,
})

function Home() {
	const worlds = useQuery(convexQuery(api.worlds.list, {}))

	if (worlds.isError) {
		return (
			<main className="container">
				<p>Failed to load worlds.</p>
				<pre>{worlds.error.message}</pre>
			</main>
		)
	}

	if (!worlds.data) {
		return <LoadingIcon />
	}

	return (
		<PageLayout title="Choose a world">
			<div className="flex flex-col gap-2">
				{worlds.data.map((world) => (
					<Link key={world._id} to="/worlds/$id" params={{ id: world._id }}>
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
