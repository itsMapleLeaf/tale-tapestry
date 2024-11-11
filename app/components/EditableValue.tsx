import { ComponentProps, useState } from "react"
import { twMerge } from "tailwind-merge"

export function EditableValue({
	onChange,
	...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
	value?: string
	onChange?: (value: string) => void
}) {
	const [state, setState] = useState<
		{ status: "idle" } | { status: "editing"; value: string }
	>({ status: "idle" })

	const className = twMerge(
		"border-primary-800 bg-primary-900/50 focus:bg-primary-900 focus:border-primary-600 h-10 rounded px-3 outline-none transition-colors",
		props.className,
	)

	const submit = (value: string) => {
		if (value !== (props.value ?? "")) {
			onChange?.(value)
		}
		setState({ status: "idle" })
	}

	return state.status === "idle" ? (
		<input
			{...props}
			className={className}
			value={props.value ?? ""}
			readOnly
			onFocus={() => {
				setState({ status: "editing", value: props.value ?? "" })
			}}
		/>
	) : (
		<input
			{...props}
			className={className}
			value={state.value}
			onChange={(event) => {
				setState({ ...state, value: event.target.value })
			}}
			onBlur={() => {
				submit(state.value)
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					submit(state.value)
					event.preventDefault()
					event.currentTarget.blur()
				}
			}}
		/>
	)
}
