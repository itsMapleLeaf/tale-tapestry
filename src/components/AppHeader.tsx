import { Link } from "@tanstack/react-router"
import { UserButton } from "./UserButton.tsx"

export function AppHeader() {
	return (
		<header className="container flex py-4">
			<div className="flex flex-1">
				<Link
					to="/"
					className="text-primary-200 -m-3 p-3 opacity-70 transition-opacity hover:opacity-100"
				>
					<h1 className="flex">
						<span className="text-2xl font-extralight">tale</span>
						<div className="mx-2.5 my-0.5 w-px bg-current/35"></div>
						<span className="text-2xl font-extralight">tapestry</span>
					</h1>
				</Link>
			</div>
			<div className="flex flex-1 justify-end">
				<UserButton />
			</div>
		</header>
	)
}
