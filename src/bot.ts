import { Bot } from 'grammy';
import { BotContext, Env } from './types';
import { userFeature } from './handlers/user';
import { adminFeature } from './handlers/admin';

export function createBot(env: Env, executionCtx: ExecutionContext): Bot<BotContext> {
	const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

	bot.use(async (ctx, next) => {
		ctx.env = env;
		ctx.executionCtx = executionCtx;
		await next();
	});

	bot.catch((err) => {
		console.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
	});

	// Routing logic: Separate Admin commands from User commands
	bot.route((ctx) => {
		const isFromAdminChat = ctx.chat?.id.toString() === ctx.env.ADMIN_CHAT_ID;
		return isFromAdminChat ? 'admin' : 'user';
	}, {
		admin: adminFeature,
		user: userFeature,
	});

	return bot;
}
