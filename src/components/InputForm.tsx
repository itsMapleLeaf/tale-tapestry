import { LucideArrowRight } from "lucide-react"
import { ChangeEvent, HTMLAttributes, ReactElement, ReactNode } from "react"
import { Button } from "./Button.tsx"
import { InputWithButton } from "./InputWithButton.tsx"

export function InputForm({
	icon = <LucideArrowRight />,
	buttonLabel = "Submit",
	action,
	required = true,
	multiline = false,
	className,
	...props
}: HTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & {
	icon?: ReactElement | null
	action: (value: string) => unknown
	buttonLabel?: ReactNode
	multiline?: boolean
	required?: boolean
	placeholder?: string
}) {
	const handleChange = (
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const value = event.currentTarget.value.trim()
		if (value === "" && required) {
			event.currentTarget.setCustomValidity(
				value !== event.currentTarget.value
					? "Cannot be empty (content only has spaces)"
					: "Cannot be empty",
			)
			event.preventDefault()
		} else {
			event.currentTarget.setCustomValidity("")
		}
	}
	return (
		<form
			action={(formData) => action((formData.get("value") as string).trim())}
			className={className}
		>
			{multiline ? (
				<div className="flex flex-col items-start gap-2">
					<textarea
						className="input w-full"
						required={required}
						{...props}
						name="value"
						onChange={handleChange}
					/>
					<Button type="submit" icon={icon}>
						{buttonLabel}
					</Button>
				</div>
			) : (
				<InputWithButton
					required={required}
					{...props}
					name="value"
					onChange={handleChange}
					button={
						<Button type="submit" icon={icon}>
							<span className="sr-only">{buttonLabel}</span>
						</Button>
					}
				/>
			)}
		</form>
	)
}
