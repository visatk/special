import { Bot } from 'grammy';
import { BotContext, Env } from './types';
import { setupCommands } from './handlers/commands';

export function createBot(env: Env): Bot<BotContext> {
	const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

	// Middleware: Inject Cloudflare Environment bindings into Grammy Context
	bot.use(async (ctx, next) => {
		ctx.env = env;
		await next();
	});

	// Global Error Handling
	bot.catch((err) => {
		console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
	});

	setupCommands(bot);

	return bot;
}
