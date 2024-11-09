import { useAuthActions } from "@convex-dev/auth/react"
import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api.js"

export const Route = createFileRoute("/_protected/")({
	component: Home,
})

function Home() {
	const userQuery = useQuery(convexQuery(api.auth.user, {}))
	const authActions = useAuthActions()

	if (userQuery.isLoading) {
		return <p>Loading...</p>
	}

	if (!userQuery.data) {
		return (
			<button
				type="button"
				onClick={() => authActions.signIn("discord")}
				className="button"
			>
				Discord Sign In
			</button>
		)
	}

	return <>home</>
}
