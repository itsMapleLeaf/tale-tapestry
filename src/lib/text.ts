export function dedent(consts: TemplateStringsArray, ...values: unknown[]) {
	const text = String.raw(consts, ...values)
	const lines = text.split("\n")

	// Find minimum indentation level across all non-empty lines
	const minIndent = lines
		.filter((line) => line.trim())
		.reduce((min, line) => {
			const indent = line.match(/^\s*/)?.[0].length ?? 0
			return Math.min(min, indent)
		}, Infinity)

	// Remove that amount of indentation from all lines
	return lines
		.map((line) => line.slice(minIndent))
		.join("\n")
		.trim()
}
