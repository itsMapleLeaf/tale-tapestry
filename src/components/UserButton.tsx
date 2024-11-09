import { useAuthActions } from "@convex-dev/auth/react"
import { convexQuery, useConvexAuth } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { LucideLogOut, LucideUserCircle2, LucideWrench } from "lucide-react"
import { api } from "../../convex/_generated/api.js"
import { Menu, MenuButton, MenuItem, MenuPanel } from "./Menu.tsx"

export function UserButton() {
	const user = useQuery(convexQuery(api.auth.user, {})).data
	const auth = useConvexAuth()
	if (auth.isLoading) return null
	if (!user) return null
	return (
		<Menu placement="bottom-end">
			<MenuButton className="text-primary-200 bg-primary-800 flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100">
				{user.image ? (
					<img
						src={user.image}
						alt=""
						className="size-full rounded-[inherit]"
					/>
				) : (
					<LucideUserCircle2 className="size-full rounded-[inherit]" />
				)}
			</MenuButton>
			<MenuPanel>
				<MenuItem
					icon={<LucideWrench />}
					className="hover:bg-primary-800/50 flex h-10 cursor-default items-center justify-start gap-2 rounded-sm px-2"
					render={<Link to="/settings" />}
				>
					Settings
				</MenuItem>
				<SignOutMenuItem />
			</MenuPanel>
		</Menu>
	)
}

function SignOutMenuItem() {
	const authActions = useAuthActions()
	return (
		<MenuItem
			icon={<LucideLogOut />}
			hideOnClick={false}
			onClick={authActions.signOut}
		>
			Sign out
		</MenuItem>
	)
}
