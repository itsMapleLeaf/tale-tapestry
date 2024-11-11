import { useConvexAction } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { InputForm } from "./InputForm.tsx"
import { PageSection } from "./PageSection.tsx"

interface OnboardingProps {
	worldId: Id<"worlds">
}

export function Onboarding({ worldId }: OnboardingProps) {
	const onboard = useMutation({
		mutationFn: useConvexAction(api.worlds.createInitialContent),
	})
	const [name, setName] = useState<string>()
	const [pronouns, setPronouns] = useState<string>()
	const [description, setDescription] = useState<string>()
	const [location, setLocation] = useState<string>()
	const [time, setTime] = useState<string>()

	return (
		<>
			{name == null ? (
				<PageSection title="What's your character's name?">
					<InputForm
						placeholder="Maple Rosenfeld"
						defaultValue="Maple Rosenfeld"
						action={setName}
					/>
				</PageSection>
			) : pronouns == null ? (
				<PageSection title="What are their pronouns?">
					<InputForm
						placeholder="she/her"
						defaultValue="she/her"
						action={setPronouns}
					/>
				</PageSection>
			) : description == null ? (
				<PageSection title="Tell me more about them. (optional)">
					<InputForm
						placeholder="She's a friendly, hard-working, earnest, expert ice mage, but a little clumsy, airheaded, and easily frightened."
						defaultValue="She's a friendly, hard-working, earnest, expert ice mage, but a little clumsy, airheaded, and easily frightened."
						required={false}
						multiline
						action={setDescription}
					/>
				</PageSection>
			) : location == null ? (
				<PageSection title="Where are they now?">
					<InputForm
						placeholder="her bedroom"
						defaultValue="her bedroom"
						action={setLocation}
					/>
				</PageSection>
			) : time == null ? (
				<PageSection title="What time is it?">
					<InputForm
						placeholder="early morning"
						defaultValue="early morning"
						action={async (value) => {
							setTime(value)
							await onboard
								.mutateAsync({
									worldId,
									name,
									pronouns,
									description,
									location,
									time: value,
								})
								.catch(() => {})
						}}
					/>
				</PageSection>
			) : null}
		</>
	)
}
