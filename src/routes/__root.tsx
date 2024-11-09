import { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	Outlet,
	ScrollRestoration,
} from "@tanstack/react-router"
import { Body, Head, Html, Meta, Scripts } from "@tanstack/start"
import * as React from "react"
import { AppHeader } from "../components/AppHeader.tsx"

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
		<RootDocument>
			<Outlet />
		</RootDocument>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<Html>
			<Head>
				<Meta />
			</Head>
			<Body>
				<AppHeader />
				<main className="container">{children}</main>
				<ScrollRestoration />
				<Scripts />
			</Body>
		</Html>
	)
}
