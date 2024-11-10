import { ReactNode } from "react"

export function PageLayout({
	title,
	description,
	children,
}: {
	title: ReactNode
	description?: ReactNode
	children: ReactNode
}) {
	return (
		<div className="container flex max-w-[720px] flex-col gap-3 py-32">
			<header>
				<h1 className="text-4xl font-extralight">{title}</h1>
				<p className="text-primary-200 text-xl">{description}</p>
			</header>
			{children}
		</div>
	)
}
