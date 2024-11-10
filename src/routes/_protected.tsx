import { useAuthActions } from "@convex-dev/auth/react"
import { convexQuery, useConvexAuth } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { api } from "../../convex/_generated/api.js"

export const Route = createFileRoute("/_protected")({
	component: ProtectedLayout,
})

function ProtectedLayout() {
	const userQuery = useQuery(convexQuery(api.auth.user, {}))
	const authActions = useAuthActions()
	const auth = useConvexAuth()

	if (userQuery.isLoading || auth.isLoading) {
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

	return <Outlet />
}
