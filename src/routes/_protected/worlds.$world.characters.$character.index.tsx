import { convexQuery, useConvexAction } from "@convex-dev/react-query"
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
		mutationFn: useConvexAction(api.characters.act),
	})

	const [current, ...previous] = prompts.toReversed()

	if (!current) {
		return (
			<form action={() => createPrompt.mutate({ characterId, action: null })}>
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
					<p className="whitespace-pre-line opacity-40 transition-opacity hover:opacity-70">
						{prompt.content}
					</p>
					{prompt.stateUpdate && (
						<div className="opacity-40 transition-opacity hover:opacity-70">
							<StateUpdateSummary stateUpdate={prompt.stateUpdate} />
						</div>
					)}
				</Fragment>
			))}
			<div className="vstack">
				<p className="text-lg whitespace-pre-line">{current.content}</p>
				{current.status === "pending" && <LoadingIcon />}
				{current.stateUpdate && current.status !== "pending" && (
					<StateUpdateSummary stateUpdate={current.stateUpdate} />
				)}
			</div>
			{current.status === "pending" ? null : (
				<InputForm
					placeholder="Do something..."
					action={(action) =>
						createPrompt.mutateAsync({ characterId, action }).catch()
					}
				/>
			)}
		</div>
	)
}

function StateUpdateSummary({
	stateUpdate,
}: {
	stateUpdate: NonNullable<Doc<"prompts">["stateUpdate"]>
}) {
	const items = [
		...stateUpdate.characters.map((character) => ({
			name: character.name,
			properties: character.properties.map(({ key, value }) => ({
				key,
				value,
			})),
		})),
		...stateUpdate.locations.map((location) => ({
			name: location.name,
			properties: location.properties.map(({ key, value }) => ({
				key,
				value,
			})),
		})),
		{
			name: "World",
			properties: [{ key: "time", value: stateUpdate.world.time }],
		},
	].filter((item) => item.properties.length > 0)

	if (items.length === 0) return null

	return (
		<div className="vstack gap-4 text-sm">
			{items.map((item) => (
				<div key={item.name} className="vstack gap-1">
					<span className="font-medium">{item.name}</span>
					<ul className="vstack text-primary-300 list-disc gap-0.5 pl-4">
						{item.properties.map(({ key, value }) => (
							<li key={key}>
								<span className="font-medium">{key}</span>: {value}
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}
