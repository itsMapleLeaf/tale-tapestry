import { useCallback, useEffect, useRef } from "react"

export function useDebouncedCallback<Args extends unknown[]>(
	callback: (...args: Args) => void,
	period: number,
) {
	const callbackRef = useRef(callback)
	useEffect(() => {
		callbackRef.current = callback
	})

	const id = useRef<number>()
	return useCallback((...args: Args) => {
		if (id.current != null) {
			window.clearTimeout(id.current)
		}
		id.current = window.setTimeout(() => {
			callbackRef.current(...args)
		}, period)
	}, [])
}
