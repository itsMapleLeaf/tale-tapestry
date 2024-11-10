import { ComponentProps, ReactNode } from "react"
import { twMerge } from "tailwind-merge"

type FieldProps = ComponentProps<"div"> & {
	label: ReactNode
	htmlFor?: string
	children: ReactNode
}

export function Field({
	label,
	htmlFor,
	children,
	className,
	...props
}: FieldProps) {
	return (
		<div {...props} className={twMerge("flex flex-col", className)}>
			<label htmlFor={htmlFor} className="mb-0.5 text-sm font-medium">
				{label}
			</label>
			{children}
		</div>
	)
}
