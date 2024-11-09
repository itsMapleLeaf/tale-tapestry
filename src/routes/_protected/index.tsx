import { useConvexAction } from "@convex-dev/react-query"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LucideArrowRight, LucideRefreshCcw } from "lucide-react"
import { useId, useState } from "react"
import { twMerge } from "tailwind-merge"
import { api } from "../../../convex/_generated/api"
import { Button } from "../../components/Button.tsx"
import { Input } from "../../components/Input.tsx"
import { LoadingIcon } from "../../components/LoadingIcon.tsx"
import { unique } from "../../lib/iterable.ts"

export const Route = createFileRoute("/_protected/")({
	component: Home,
})

function Home() {
	const [animateRef] = useAutoAnimate({ easing: "ease-out", duration: 150 })
	return (
		<PageLayout
			heading="Create a new world"
			subheading="Give your world a name."
		>
			<main className="flex flex-col gap-3" ref={animateRef}>
				<InputWithButton
					aria-label="World name"
					placeholder="Eisenwald"
					button={
						<Button icon={<LucideArrowRight />}>
							<span className="sr-only">Next</span>
						</Button>
					}
				/>
				<NameSuggestions />
			</main>
		</PageLayout>
	)
}

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

function NameSuggestions() {
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
			<Section title="Failed to load suggestions.">
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
			</Section>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			<Section title="Can't think of a name? Here are some suggestions:">
				<div className="max-h-[480px] overflow-y-auto">
					<ul className="flex flex-col gap-2">
						{unique(nameSuggestionsQuery.data.suggestions).map((name) => (
							<li key={name}>
								<Button icon={null}>{name}</Button>
							</li>
						))}
					</ul>
				</div>
			</Section>

			<Section title="None of these feel right? Pick a theme to see more:">
				<ul aria-label="Alternate themes" className="flex flex-wrap gap-2">
					{[...defaultThemes].map((theme) => (
						<li key={theme}>
							<Button icon={null} onClick={() => handleThemeChanged(theme)}>
								{theme}
							</Button>
						</li>
					))}
				</ul>
			</Section>

			<Section title="Or, choose your own:">
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
			</Section>
		</div>
	)
}

function PageLayout({
	heading,
	subheading,
	children,
}: {
	heading: string
	subheading: string
	children: React.ReactNode
}) {
	return (
		<div className="container flex max-w-[720px] flex-col gap-3 py-32">
			<header>
				<h1 className="text-4xl font-extralight">{heading}</h1>
				<p className="text-primary-200 text-xl">{subheading}</p>
			</header>
			{children}
		</div>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	const headingId = useId()
	return (
		<section aria-labelledby={headingId}>
			<h2 id={headingId} className="text-primary-200 mb-1">
				{title}
			</h2>
			{children}
		</section>
	)
}

function InputWithButton({
	button,
	className,
	...inputProps
}: {
	button: React.ReactNode
	className?: string
} & React.ComponentPropsWithoutRef<typeof Input>) {
	return (
		<div className={twMerge("flex max-w-64 gap-2", className)}>
			<Input {...inputProps} className="flex-1 self-start" />
			{button}
		</div>
	)
}
