export function omit<
	T extends NonNullable<unknown>,
	K extends keyof T | (PropertyKey & {}),
>(input: T, keys: Iterable<K>) {
	const output: Record<string, unknown> = {}
	const keySet = new Set<PropertyKey>(keys)
	for (const key of Object.keys(input)) {
		if (!keySet.has(key)) {
			output[key] = input[key as keyof T]
		}
	}
	return output as Omit<T, K>
}
