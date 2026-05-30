import { Composer } from 'grammy';
import { BotContext } from '../types';
import { saveMessageMapping, saveUser } from '../db/mappings';

export const userFeature = new Composer<BotContext>();

// UX: Clear onboarding message
userFeature.command('start', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	ctx.executionCtx.waitUntil(
		saveUser(ctx.env.DB, user.id, user.first_name, user.username)
			.catch(console.error)
	);

	await ctx.reply(
		`👋 <b>Hello, ${user.first_name}!</b>\n\n` +
		`Send me any message, question, or media, and the support team will get back to you shortly.`,
		{ parse_mode: 'HTML' }
	);
});

// Forward everything else to Admin
userFeature.on('message', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	// UI/UX: Beautiful admin ticket header
	const userLink = user.username ? `@${user.username}` : `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
	const headerText = `📨 <b>New Ticket</b>\n👤 From: ${userLink}\n🆔 ID: <code>${user.id}</code>\n\n`;

	try {
		// Send user info header
		await ctx.api.sendMessage(ctx.env.ADMIN_CHAT_ID, headerText, { parse_mode: 'HTML' });

		// Copy the actual message (supports images, files, voices, etc.)
		const copiedMsg = await ctx.copyMessage(ctx.env.ADMIN_CHAT_ID);

		// Performance: Save mapping in background using waitUntil
		ctx.executionCtx.waitUntil(
			saveMessageMapping(ctx.env.DB, copiedMsg.message_id, user.id, ctx.message.message_id)
				.catch(console.error)
		);
	} catch (error) {
		console.error('Failed to forward to admin:', error);
		await ctx.reply('⚠️ Failed to send your message. Please try again later.');
	}
});
