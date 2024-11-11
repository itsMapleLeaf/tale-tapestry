// @ts-nocheck
import js from "@eslint/js"
import react from "eslint-plugin-react"
import reactCompiler from "eslint-plugin-react-compiler"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import ts from "typescript-eslint"

export default ts.config(
	// global file config
	{
		ignores: [
			"**/node_modules/**",
			"build/**",
			"convex/_generated/**",
			"test-results/**",
			".turbo/**",
			".vercel/**",
			"convex-backend/**",
		],
	},

	// node.js environment
	{
		files: ["./*"],
		languageOptions: {
			globals: { ...globals.node },
		},
	},

	// browser/edge environment
	{
		files: ["./src/**", "./convex/**", "./shared/**"],
		languageOptions: {},
	},

	// javascript
	js.configs.recommended,
	{
		rules: {
			"object-shorthand": "warn",
		},
	},

	// typescript
	...ts.configs.recommended,
	{
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-empty-object-type": "off",
		},
	},

	// react
	react.configs.flat?.recommended,
	react.configs.flat?.["jsx-runtime"],
	{
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			"react/prop-types": "off",
		},
	},

	// react-hooks
	{
		plugins: { "react-hooks": reactHooks },
		rules: reactHooks.configs.recommended.rules,
	},

	// react-compiler
	{
		plugins: {
			"react-compiler": reactCompiler,
		},
		rules: {
			"react-compiler/react-compiler": "error",
		},
	},
)
