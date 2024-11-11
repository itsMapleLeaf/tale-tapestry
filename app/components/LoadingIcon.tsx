import { LucideLoaderCircle } from "lucide-react"
import { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

export function LoadingIcon(props: ComponentProps<typeof LucideLoaderCircle>) {
	return (
		<LucideLoaderCircle
			{...props}
			className={twMerge("animate-spin", props.className)}
		/>
	)
}
