import { ComponentProps, useId } from "react"
import { Field } from "./Field.tsx"
import { Input } from "./Input.tsx"

interface InputFieldProps extends ComponentProps<typeof Input> {
	label: React.ReactNode
}

export function InputField({
	label,
	className,
	...inputProps
}: InputFieldProps) {
	const id = useId()
	return (
		<Field label={label} htmlFor={inputProps.id ?? id} className={className}>
			<Input id={id} {...inputProps} />
		</Field>
	)
}
