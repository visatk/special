import { Composer } from 'grammy';
import { BotContext } from '../types';
import { saveMessageMappingsBatch, saveUser, getUser } from '../db/mappings';

export const userFeature = new Composer<BotContext>();

// Middleware: Block banned users silently
userFeature.use(async (ctx, next) => {
	const user = ctx.from;
	if (!user) return;

	const dbUser = await getUser(ctx.env.DB, user.id);
	if (dbUser && dbUser.is_banned === 1) return;
	
	await next();
});

userFeature.command('start', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	ctx.executionCtx.waitUntil(saveUser(ctx.env.DB, user.id, user.first_name, user.username).catch(console.error));

	await ctx.reply(`👋 <b>Hello, ${user.first_name}!</b>\n\nSend me any message, question, or media, and the support team will get back to you.`, {
		parse_mode: 'HTML',
	});
});

// Forward messages to admin
userFeature.on('message', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	const userLink = user.username ? `@${user.username}` : `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
	const headerText = `📨 <b>New Ticket</b>\n👤 From: ${userLink}\n🆔 ID: <code>${user.id}</code>\n\n`;

	try {
		const headerMsg = await ctx.api.sendMessage(ctx.env.ADMIN_CHAT_ID, headerText, { parse_mode: 'HTML' });
		const copiedMsg = await ctx.copyMessage(ctx.env.ADMIN_CHAT_ID);

		ctx.executionCtx.waitUntil(
			saveMessageMappingsBatch(ctx.env.DB, user.id, ctx.message.message_id, [headerMsg.message_id, copiedMsg.message_id])
				.catch(console.error)
		);
	} catch (error) {
		console.error('Failed to forward:', error);
		await ctx.reply('⚠️ Our servers are currently busy. Please try again later.');
	}
});
