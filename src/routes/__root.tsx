import { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	Outlet,
	ScrollRestoration,
} from "@tanstack/react-router"
import { Meta } from "@tanstack/start"

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
}>()({
	meta: () => [
		{
			charSet: "utf-8",
		},
		{
			name: "viewport",
			content: "width=device-width, initial-scale=1",
		},
		{
			title: "tale tapestry",
		},
	],
	component: RootComponent,
})

function RootComponent() {
	return (
		<>
			<Outlet />
			<Meta />
			<ScrollRestoration />
		</>
	)
}

/*
function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<Html>
			<Head>
				<Meta />
			</Head>
			<Body>
				{children}
				<Scripts />
			</Body>
		</Html>
	)
}
*/
