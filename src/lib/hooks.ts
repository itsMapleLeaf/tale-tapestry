import { useCallback, useEffect, useRef } from "react"

export function useDebouncedCallback<Args extends unknown[]>(
	callback: (...args: Args) => void,
	period: number,
) {
	const callbackRef = useValueRef(callback)
	const id = useRef<number>(undefined)
	return useCallback(
		(...args: Args) => {
			if (id.current != null) {
				window.clearTimeout(id.current)
			}
			id.current = window.setTimeout(() => {
				callbackRef.current(...args)
			}, period)
		},
		[callbackRef, period],
	)
}

export function useValueRef<T>(value: T) {
	const ref = useRef(value)
	useEffect(() => {
		ref.current = value
	})
	return ref
}
