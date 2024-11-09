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

import {} from "@total-typescript/ts-reset"
