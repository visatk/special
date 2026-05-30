import { Composer } from 'grammy';
import { BotContext } from '../types';
import { saveMessageMappingsBatch, saveUser } from '../db/mappings';

export const userFeature = new Composer<BotContext>();

userFeature.command('start', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	ctx.executionCtx.waitUntil(saveUser(ctx.env.DB, user.id, user.first_name, user.username).catch(console.error));

	await ctx.reply(`👋 <b>Hello, ${user.first_name}!</b>\n\nSend me any message, question, or media, and we will get back to you.`, {
		parse_mode: 'HTML',
	});
});

// Handle all incoming messages from users
userFeature.on('message', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	const userLink = user.username ? `@${user.username}` : `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
	const headerText = `📨 <b>New Ticket</b>\n👤 From: ${userLink}\n🆔 ID: <code>${user.id}</code>\n\n`;

	try {
		// 1. Send Header
		const headerMsg = await ctx.api.sendMessage(ctx.env.ADMIN_CHAT_ID, headerText, { parse_mode: 'HTML' });
		// 2. Copy actual message (supports all media types)
		const copiedMsg = await ctx.copyMessage(ctx.env.ADMIN_CHAT_ID);

		// Bug Fix & Performance: Map both messages to the user using a background batch operation
		ctx.executionCtx.waitUntil(
			saveMessageMappingsBatch(ctx.env.DB, user.id, ctx.message.message_id, [headerMsg.message_id, copiedMsg.message_id]).catch(
				(err) => console.error('Failed to save mappings:', err)
			)
		);
	} catch (error) {
		console.error('Failed to forward to admin:', error);
		await ctx.reply('⚠️ Our servers are currently busy. Please try again later.');
	}
});
