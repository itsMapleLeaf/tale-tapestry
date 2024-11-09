import { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

export function Input({
	onChangeValue,
	...props
}: ComponentProps<"input"> & { onChangeValue?: (value: string) => void }) {
	return (
		<input
			{...props}
			className={twMerge(
				"border-primary-800 bg-primary-900/50 focus:bg-primary-900 focus:border-primary-600 h-10 rounded px-3 outline-none transition-colors",
				props.className,
			)}
			onChange={(event) => {
				props.onChange?.(event)
				onChangeValue?.(event.target.value)
			}}
		/>
	)
}
