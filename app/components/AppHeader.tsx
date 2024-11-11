import { Link } from "@tanstack/react-router"
import { UserButton } from "./UserButton.tsx"

export function AppHeader() {
	return (
		<header className="container flex py-4">
			<div className="flex flex-1">
				<Link
					to="/"
					className="text-primary-200 -mx-3 -my-2 rounded-md px-3 py-2 opacity-70 transition-opacity hover:opacity-100"
				>
					<h1 className="flex gap-1.5 text-2xl font-extralight">
						tale tapestry
					</h1>
				</Link>
			</div>
			<div className="flex flex-1 justify-end">
				<UserButton />
			</div>
		</header>
	)
}
