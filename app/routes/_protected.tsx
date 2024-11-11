import { useAuthActions } from "@convex-dev/auth/react"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react"
import { LoadingCover } from "../components/LoadingCover.js"

export const Route = createFileRoute("/_protected")({
	component: ProtectedLayout,
})

function ProtectedLayout() {
	const authActions = useAuthActions()
	return (
		<>
			<AuthLoading>
				<LoadingCover />
			</AuthLoading>
			<Authenticated>
				<Outlet />
			</Authenticated>
			<Unauthenticated>
				<button
					type="button"
					onClick={() => authActions.signIn("discord")}
					className="button"
				>
					Discord Sign In
				</button>
			</Unauthenticated>
		</>
	)
}
