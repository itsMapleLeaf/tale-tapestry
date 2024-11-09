import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routerWithQueryClient } from "@tanstack/react-router-with-query"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
	const convexQueryClient = new ConvexQueryClient(
		import.meta.env.VITE_CONVEX_URL,
	)

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	})
	convexQueryClient.connect(queryClient)

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			context: { queryClient },
			Wrap: ({ children }) => (
				<ConvexAuthProvider client={convexQueryClient.convexClient}>
					{children}
				</ConvexAuthProvider>
			),
		}),
		queryClient,
	)

	return router
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
