export function unique<T>(iterable: Iterable<T>) {
	return [...new Set(iterable)]
}
