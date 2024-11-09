import {} from "@total-typescript/ts-reset"
import {} from "vite/client"
declare global {
	interface ImportMetaEnv {
		readonly VITE_CONVEX_URL: string
	}

	const process: {
		env: {
			DISCORD_CLIENT_ID: string
			DISCORD_CLIENT_SECRET: string
		}
	}
}
