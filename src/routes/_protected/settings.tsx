import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LucideCheckCircle2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { IconLabel } from "../../components/IconLabel.tsx"
import { InputField } from "../../components/InputField.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { useDebouncedCallback } from "../../lib/hooks.ts"

export const Route = createFileRoute("/_protected/settings")({
	component: Settings,
})

function Settings() {
	const user = useSuspenseQuery(convexQuery(api.auth.user, {}))

	const update = useMutation({
		mutationFn: useConvexMutation(api.auth.update),
	})
	const updateDebounced = useDebouncedCallback(update.mutate, 500)

	return (
		<div className="flex flex-col gap-3">
			<InputField
				label="OpenRouter API Key"
				placeholder="sk-or-v1-..."
				defaultValue={user.data?.openRouterApiKey}
				onChangeValue={(value) => {
					updateDebounced({ openRouterApiKey: value })
				}}
			/>
			<div className="flex items-center gap-2 opacity-75">
				{update.status === "pending" ? (
					<IconLabel icon={<LoadingIcon />} text="Saving..." />
				) : update.status === "success" ? (
					<IconLabel icon={<LucideCheckCircle2 />} text="Saved" />
				) : null}
			</div>
		</div>
	)
}
