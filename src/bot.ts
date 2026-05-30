import { Bot } from 'grammy';
import { BotContext, Env } from './types';
import { setupCommands } from './handlers/commands';

export function createBot(env: Env, executionCtx: ExecutionContext): Bot<BotContext> {
	const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

	// Middleware: Inject Cloudflare Environment & Execution Context
	bot.use(async (ctx, next) => {
		ctx.env = env;
		ctx.executionCtx = executionCtx; 
		await next();
	});

	// Global Error Handling
	bot.catch((err) => {
		console.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
	});

	setupCommands(bot);

	return bot;
}
