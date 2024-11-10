import { useId } from "react"

export function PageSection({
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
