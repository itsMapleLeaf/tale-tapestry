import { LoadingIcon } from "./LoadingIcon.tsx"

export function LoadingCover() {
	return (
		<div className="absolute inset-0 flex flex-col">
			<LoadingIcon className="m-auto size-16" />
		</div>
	)
}
