import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_protected/settings")({
	component: Settings,
})

function Settings() {
	return <p>settings</p>
}
