import {
	cloneElement,
	ComponentProps,
	HTMLAttributes,
	ReactElement,
} from "react"
import { useFormStatus } from "react-dom"
import { twMerge } from "tailwind-merge"
import { LoadingIcon } from "./LoadingIcon.tsx"

export interface ButtonProps extends ComponentProps<"button"> {
	icon: ReactElement | null
	pending?: boolean
	render?: ReactElement<HTMLAttributes<HTMLElement>>
}

export function Button({
	icon,
	pending,
	render = <button type="button" />,
	children,
	...props
}: ButtonProps) {
	const status = useFormStatus()

	return cloneElement(render, {
		className: twMerge("button", props.className),
		children: (
			<>
				{" "}
				<div className="*:size-5 empty:hidden">
					{(pending ?? status.pending) ? (
						<LoadingIcon className="animate-spin" />
					) : (
						icon
					)}
				</div>
				{children}
			</>
		),
		...props,
	})
}
