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
					{prompt.mutations && prompt.mutations.length > 0 && (
						<div className="opacity-40 transition-opacity hover:opacity-70">
							<StateUpdateSummary mutations={prompt.mutations} />
						</div>
					)}
				</Fragment>
			))}
			<div className="vstack">
				<p className="text-lg whitespace-pre-line">{current.content}</p>
				{current.status === "pending" && <LoadingIcon />}
				{current.mutations &&
					current.mutations.length > 0 &&
					current.status !== "pending" && (
						<StateUpdateSummary mutations={current.mutations} />
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
	mutations,
}: {
	mutations: NonNullable<Doc<"prompts">["mutations"]>
}) {
	if (!mutations.length) return null

	return (
		<ul className="vstack text-sm">
			{mutations.map((mutation, i) => {
				let description: React.ReactNode
				switch (mutation.type) {
					case "setWorldTime":
						description = (
							<>
								Time in <strong>{mutation.worldName}</strong> changed to{" "}
								<strong>{mutation.time}</strong>
							</>
						)
						break
					case "setCharacterLocation":
						description = (
							<>
								<strong>{mutation.characterName}</strong> moved to{" "}
								<strong>{mutation.locationName}</strong>
							</>
						)
						break
					case "setCharacterPronouns":
						description = (
							<>
								<strong>{mutation.characterName}</strong>&apos;s pronouns
								changed to <strong>{mutation.pronouns}</strong>
							</>
						)
						break
					case "createLocation":
						description = (
							<>
								Created new location <strong>{mutation.locationName}</strong>
							</>
						)
						break
					case "createCharacter":
						description = (
							<>
								Created new character <strong>{mutation.characterName}</strong>{" "}
								at <strong>{mutation.locationName}</strong>
							</>
						)
						break
					case "setProperty":
						description = (
							<>
								Set <strong>{mutation.entity.name}</strong>&apos;s{" "}
								<strong>{mutation.key}</strong> to{" "}
								<strong>{mutation.value}</strong>
							</>
						)
						break
					case "removeProperty":
						description = (
							<>
								Removed <strong>{mutation.key}</strong> from{" "}
								<strong>{mutation.entity.name}</strong>
							</>
						)
						break
				}

				return (
					<li key={i} className="text-primary-300 list-inside list-disc pl-1.5">
						{description}
					</li>
				)
			})}
		</ul>
	)
}
