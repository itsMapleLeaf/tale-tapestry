import { useConvexAction, useConvexMutation } from "@convex-dev/react-query"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LucideArrowRight, LucideRefreshCcw } from "lucide-react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { unique } from "../../../lib/iterable.ts"
import { Button } from "../../components/Button.tsx"
import { InputWithButton } from "../../components/InputWithButton.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { PageLayout } from "../../components/PageLayout.tsx"
import { PageSection } from "../../components/PageSection.tsx"

export const Route = createFileRoute("/_protected/worlds/new")({
	component: NewWorldRoute,
})

const initialTheme = "Fantasy"

const defaultThemes = new Set([
	initialTheme,
	"Modern / Contemporary",
	"Sci-fi / Futuristic",
	"Slice of Life",
	"Nordic",
	"Celtic",
	"Germanic",
	"French",
	"Russian",
	"East Asian",
])

function NewWorldRoute() {
	const navigate = useNavigate()
	const createWorld = useConvexMutation(api.worlds.create)
	const [animateRef] = useAutoAnimate({ easing: "ease-out", duration: 150 })

	const createWorldAction = async (formData: FormData) => {
		try {
			const name = (formData.get("name") as string).trim()
			if (!name) return

			const worldId = await createWorld({ name: name.trim() })
			navigate({ to: "/worlds/$world", params: { world: worldId } })
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<PageLayout
			title="Create a new world"
			description="Give your world a name."
		>
			<main className="flex flex-col gap-3" ref={animateRef}>
				<form action={createWorldAction} className="contents">
					<InputWithButton
						name="name"
						aria-label="World name"
						placeholder="Eisenwald"
						button={
							<Button type="submit" icon={<LucideArrowRight />}>
								<span className="sr-only">Next</span>
							</Button>
						}
					/>
				</form>
				<NameSuggestions createWorldAction={createWorldAction} />
			</main>
		</PageLayout>
	)
}

function NameSuggestions({
	createWorldAction,
}: {
	createWorldAction: (formData: FormData) => void
}) {
	const suggestNames = useConvexAction(api.worlds.suggestNames)
	const [theme, setTheme] = useState(initialTheme)

	const nameSuggestionsQuery = useQuery({
		queryKey: ["worldNameSuggestions", theme],
		queryFn: () => suggestNames({ theme }),
		retry: 3,
		staleTime: Number.POSITIVE_INFINITY,
	})

	const handleThemeChanged = (theme: string) => {
		setTheme(theme)
		requestAnimationFrame(() => {
			nameSuggestionsQuery.refetch()
		})
	}

	if (nameSuggestionsQuery.isFetching) {
		return (
			<section className="text-primary-300 flex gap-2">
				<LoadingIcon />
				<p>Loading suggestions...</p>
			</section>
		)
	}

	if (!nameSuggestionsQuery.data) {
		return (
			<PageSection title="Failed to load suggestions.">
				{nameSuggestionsQuery.error && (
					<pre className="text-primary-300">
						Error: {nameSuggestionsQuery.error.message}
					</pre>
				)}
				<Button
					icon={<LucideRefreshCcw />}
					onClick={() => nameSuggestionsQuery.refetch()}
					className="mt-2 self-start"
				>
					Try again
				</Button>
			</PageSection>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			<PageSection title="Can't think of a name? Here are some suggestions:">
				<div className="max-h-[480px] overflow-y-auto">
					<ul className="flex flex-col gap-2">
						{unique(nameSuggestionsQuery.data.suggestions).map((name) => (
							<li key={name}>
								<form action={createWorldAction} className="contents">
									<input type="hidden" name="name" value={name} />
									<Button type="submit" icon={null}>
										{name}
									</Button>
								</form>
							</li>
						))}
					</ul>
				</div>
			</PageSection>

			<PageSection title="None of these feel right? Pick a theme to see more:">
				<ul aria-label="Alternate themes" className="flex flex-wrap gap-2">
					{[...defaultThemes].map((theme) => (
						<li key={theme}>
							<Button icon={null} onClick={() => handleThemeChanged(theme)}>
								{theme}
							</Button>
						</li>
					))}
				</ul>
			</PageSection>

			<PageSection title="Or, choose your own:">
				<form
					className="flex max-w-64 gap-2"
					action={(formData) => {
						handleThemeChanged(formData.get("theme") as string)
					}}
				>
					<InputWithButton
						placeholder="Small Cozy Village"
						name="theme"
						button={
							<Button type="submit" icon={<LucideRefreshCcw />}>
								<span className="sr-only">Load new suggestions</span>
							</Button>
						}
					/>
				</form>
			</PageSection>
		</div>
	)
}
