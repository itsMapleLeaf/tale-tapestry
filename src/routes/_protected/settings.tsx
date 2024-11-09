import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LucideCheckCircle2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Input } from "../../components/Input.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { useDebouncedCallback } from "../../lib/hooks.ts"

export const Route = createFileRoute("/_protected/settings")({
	component: Settings,
})

function Settings() {
	const user = useQuery(convexQuery(api.auth.user, {}))

	const update = useMutation({
		mutationFn: useConvexMutation(api.auth.update),
	})
	const updateDebounced = useDebouncedCallback(update.mutate, 500)

	if (user.isError) {
		return <p>{user.error.message}</p>
	}

	if (!user.data) {
		return <p>Loading...</p>
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col">
				<label className="mb-0.5 text-sm font-medium">OpenRouter API Key</label>
				<Input
					placeholder="sk-or-v1-..."
					defaultValue={user.data.openRouterApiKey}
					onChangeValue={(value) => {
						updateDebounced({ openRouterApiKey: value })
					}}
				/>
			</div>
			<div className="flex items-center gap-2 opacity-75">
				{update.status === "pending" ? (
					<>
						<LoadingIcon className="size-5" /> Saving...
					</>
				) : update.status === "success" ? (
					<>
						<LucideCheckCircle2 className="size-5" /> Saved
					</>
				) : null}
			</div>
		</div>
	)
}
