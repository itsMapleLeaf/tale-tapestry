import * as Ariakit from "@ariakit/react"
import { useMutation } from "@tanstack/react-query"
import { LucideLoaderCircle } from "lucide-react"
import { ReactNode } from "react"
import { twMerge } from "tailwind-merge"

export function Menu(props: Ariakit.MenuProviderProps) {
	return <Ariakit.MenuProvider {...props} />
}

export function MenuButton(props: Ariakit.MenuButtonProps) {
	return <Ariakit.MenuButton {...props} />
}

export function MenuPanel(props: Ariakit.MenuProps) {
	return (
		<Ariakit.Menu
			gutter={8}
			unmountOnHide
			{...props}
			className={twMerge(
				"bg-primary-900 border-primary-800 fade-rise flex min-w-40 flex-col gap-0.5 rounded border p-1 shadow-lg",
				props.className,
			)}
		/>
	)
}

export function MenuItem({
	icon,
	pending,
	children,
	onClick,
	...props
}: Omit<Ariakit.MenuItemProps, "onClick"> & {
	icon: ReactNode
	pending?: boolean
	onClick?: (event: React.MouseEvent) => unknown
}) {
	const menu = Ariakit.useMenuContext()

	const handleClick = useMutation({
		mutationFn: async (event: React.MouseEvent) => {
			await onClick?.(event)
		},
		onSuccess() {
			menu?.hide()
		},
	})

	return (
		<Ariakit.MenuItem
			hideOnClick={false}
			{...props}
			className={twMerge(
				"hover:bg-primary-800/50 flex h-10 cursor-default items-center justify-start gap-2 rounded-sm px-2 transition-colors",
				props.className,
			)}
			onClick={handleClick.mutate}
		>
			<div className="*:size-5">
				{(pending ?? handleClick.isPending) ? (
					<LucideLoaderCircle className="animate-spin" />
				) : (
					icon
				)}
			</div>
			{children}
		</Ariakit.MenuItem>
	)
}
