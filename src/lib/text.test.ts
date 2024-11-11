import { expect, test } from "vitest"
import { dedent } from "./text.ts"

test("removes common indentation from all lines", () => {
	const result = dedent`
        hello
        world
    `
	expect(result).toBe("hello\nworld")
})

test("handles mixed indentation levels", () => {
	const result = dedent`
        first line
            indented line
        back to first level
    `
	expect(result).toBe("first line\n    indented line\nback to first level")
})

test("works with template literal interpolation", () => {
	const name = "world"
	const result = dedent`
        hello ${name}
        how are you?
    `
	expect(result).toBe("hello world\nhow are you?")
})

test("handles empty lines", () => {
	const result = dedent`
        first line

        third line
    `
	expect(result).toBe("first line\n\nthird line")
})

test("preserves indentation relative to the least indented line", () => {
	const result = dedent`
        function example() {
            const x = 1;
                const y = 2;
        }
    `
	expect(result).toBe(
		"function example() {\n    const x = 1;\n        const y = 2;\n}",
	)
})
