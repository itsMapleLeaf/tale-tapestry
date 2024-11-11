import { TableNames } from "./_generated/dataModel"
import { MutationCtx, mutation } from "./_generated/server"

export const newPlayer = mutation(async (ctx) => {
	await clearTable(ctx, "characters")
	await clearTable(ctx, "locations")
	await clearTable(ctx, "prompts")
})

export const ivory = mutation(async (ctx) => {
	await newPlayer(ctx, {})
	// todo
})

async function clearTable(ctx: MutationCtx, table: TableNames) {
	for await (const doc of ctx.db.query(table)) {
		ctx.db.delete(doc._id)
	}
}
