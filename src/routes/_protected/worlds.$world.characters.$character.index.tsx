import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LucidePlay } from "lucide-react"
import { Fragment } from "react"
import { api } from "../../../convex/_generated/api"
import { Doc, Id } from "../../../convex/_generated/dataModel"
import { Button } from "../../components/Button.tsx"
import { InputForm } from "../../components/InputForm.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"

export const Route = createFileRoute(
	"/_protected/worlds/$world/characters/$character/",
)({
	component: WorldCharacterRouteComponent,
})

function WorldCharacterRouteComponent() {
	const params = Route.useParams()
	const worldId = params.world as Id<"worlds">
	const characterId = params.character as Id<"characters">

	const { data: world } = useSuspenseQuery(
		convexQuery(api.worlds.get, { worldId }),
	)

	const { data: character } = useSuspenseQuery(
		convexQuery(api.characters.get, { characterId }),
	)

	const { data: location } = useSuspenseQuery(
		// @ts-expect-error
		convexQuery(
			api.locations.get,
			character?.locationId ? { locationId: character.locationId } : "skip",
		),
	)

	const { data: prompts } = useSuspenseQuery(
		convexQuery(api.prompts.list, { characterId }),
	)

	if (!world) {
		return <p>World not found</p>
	}

	if (!character) {
		return <p>Character not found</p>
	}

	if (!location) {
		return <p>Location not found</p>
	}

	return (
		<PageLayout
			title={character.name}
			description={`${location.name} • ${world.name}`}
		>
			<PromptList prompts={prompts} characterId={characterId} />
		</PageLayout>
	)
}

function PromptList({
	prompts,
	characterId,
}: {
	prompts: Doc<"prompts">[]
	characterId: Id<"characters">
}) {
	const createPrompt = useMutation({
		mutationFn: useConvexMutation(api.prompts.create),
	})

	const [current, ...previous] = prompts.toReversed()

	if (!current) {
		return (
			<form action={() => createPrompt.mutate({ characterId })}>
				<Button type="submit" icon={<LucidePlay />}>
					Start
				</Button>
			</form>
		)
	}

	return (
		<div className="vstack gap-4">
			{previous.toReversed().map((prompt) => (
				<Fragment key={prompt._id}>
					<p className="whitespace-pre-line opacity-75 transition-opacity hover:opacity-100">
						{prompt.content}
					</p>
				</Fragment>
			))}
			<div className="vstack">
				<p className="whitespace-pre-line">{current.content}</p>
				{current.status === "pending" && <LoadingIcon />}
			</div>
			<InputForm
				placeholder="Do something..."
				action={() => createPrompt.mutate({ characterId })}
			/>
		</div>
	)
}
