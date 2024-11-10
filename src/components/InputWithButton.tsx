import { ComponentProps, ReactNode } from "react"
import { twMerge } from "tailwind-merge"
import { Input } from "./Input.tsx"

export function InputWithButton({
	button,
	className,
	...inputProps
}: {
	button: ReactNode
	className?: string
} & ComponentProps<typeof Input>) {
	return (
		<div className={twMerge("flex max-w-64 gap-2", className)}>
			<Input {...inputProps} className="flex-1 self-start" />
			{button}
		</div>
	)
}
