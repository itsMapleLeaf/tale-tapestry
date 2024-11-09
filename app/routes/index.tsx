import { useAuthActions } from "@convex-dev/auth/react"
import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/")({
	component: Home,
})

function Home() {
	const userQuery = useQuery(convexQuery(api.auth.user, {}))
	const authActions = useAuthActions()

	if (userQuery.isLoading) {
		return (
			<main>
				<p>Loading...</p>
			</main>
		)
	}

	if (!userQuery.data) {
		return (
			<main>
				<button type="button" onClick={() => authActions.signIn("discord")}>
					Discord Sign In
				</button>
			</main>
		)
	}

	return (
		<main>
			<p>Hello {userQuery.data.name}</p>
			<button type="button" onClick={() => authActions.signOut()}>
				Sign Out
			</button>
		</main>
	)
}
