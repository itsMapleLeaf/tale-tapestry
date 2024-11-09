import { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

export function Input({
	onChangeValue,
	...props
}: ComponentProps<"input"> & { onChangeValue?: (value: string) => void }) {
	return (
		<input
			{...props}
			className={twMerge("input", props.className)}
			onChange={(event) => {
				props.onChange?.(event)
				onChangeValue?.(event.target.value)
			}}
		/>
	)
}
