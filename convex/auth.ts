import Discord from "@auth/core/providers/discord"
import { convexAuth } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store } = convexAuth({
	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
		}),
	],
})
