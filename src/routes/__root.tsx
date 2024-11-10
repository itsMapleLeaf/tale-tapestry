import { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	Outlet,
	ScrollRestoration,
} from "@tanstack/react-router"
import { Meta } from "@tanstack/start"
import { Suspense } from "react"
import { LoadingCover } from "../components/LoadingCover.tsx"

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
			<Suspense fallback={<LoadingCover />}>
				<Outlet />
			</Suspense>
			<Meta />
			<ScrollRestoration />
		</>
	)
}
