import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [TanStackRouterVite(), viteReact(), tailwindcss()],
	server: {
		watch: {
			usePolling: true,
		},
	},
})
