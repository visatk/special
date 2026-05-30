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

	const adminChatId = env.ADMIN_CHAT_ID.toString();

	// Zero-confusion chat routing
	bot.filter((ctx) => ctx.chat?.id.toString() === adminChatId).use(adminFeature);
	bot.filter((ctx) => ctx.chat?.type === 'private' && ctx.chat?.id.toString() !== adminChatId).use(userFeature);

	return bot;
}
