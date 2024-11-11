import { ComponentProps, ReactNode } from "react"
import { twMerge } from "tailwind-merge"

export function IconLabel({
	icon,
	text,
	...props
}: Omit<ComponentProps<"div">, "children"> & {
	icon: ReactNode
	text: ReactNode
}) {
	return (
		<div {...props} className={twMerge("flex items-center gap-2 opacity-75")}>
			<div className="*:size-5 empty:hidden">{icon}</div>
			{text}
		</div>
	)
}
