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

	// Strict Routing Logic
	const adminChatIdString = env.ADMIN_CHAT_ID.toString();

	// 1. Admin Feature (Only fires in the designated Admin Chat)
	bot.filter((ctx) => ctx.chat?.id.toString() === adminChatIdString).use(adminFeature);

	// 2. User Feature (Only fires in Private Chats, strictly excluding the admin chat)
	bot.filter((ctx) => ctx.chat?.type === 'private' && ctx.chat?.id.toString() !== adminChatIdString).use(userFeature);

	return bot;
}
