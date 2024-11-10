import { ReactNode } from "react"
import { twMerge } from "tailwind-merge"

type ListCardProps = React.ComponentPropsWithoutRef<"div"> & {
	title: string
	description?: ReactNode
	icon?: ReactNode
}

export function ListCard({
	title,
	description,
	icon,
	className,
	...props
}: ListCardProps) {
	return (
		<div
			className={twMerge(
				"panel flex items-center gap-2 px-2.5 py-2",
				className,
			)}
			{...props}
		>
			{icon}
			<div>
				<h2 className="heading-secondary">{title}</h2>
				<p className="subtext text-sm">{description}</p>
			</div>
		</div>
	)
}
