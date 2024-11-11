export function ensure<T>(value: T): NonNullable<T> {
	if (value == null) {
		throw new Error(`Value is ${value}`)
	}
	return value
}
