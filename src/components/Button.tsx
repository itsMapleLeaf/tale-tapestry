import { useMutation } from "@tanstack/react-query"
import { ComponentProps, ReactElement } from "react"
import { twMerge } from "tailwind-merge"
import { LoadingIcon } from "./LoadingIcon.tsx"

export interface ButtonProps extends ComponentProps<"button"> {
	icon: ReactElement | null
	pending?: boolean
	onClick?: (event: React.MouseEvent) => Promise<unknown>
}

export function Button({
	icon,
	pending,
	children,
	onClick,
	...props
}: ButtonProps) {
	const handleClick = useMutation({
		mutationFn: onClick,
	})
	return (
		<button
			type="button"
			{...props}
			className={twMerge("button", props.className)}
			onClick={handleClick.mutate}
		>
			<div className="*:size-5">
				{(pending ?? handleClick.isPending) ? (
					<LoadingIcon className="animate-spin" />
				) : (
					icon
				)}
			</div>
			{children}
		</button>
	)
}
