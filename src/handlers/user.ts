import { Composer } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { BotContext } from '../types';
import { saveMessageMappingsBatch, saveUser, checkIsBannedCached } from '../db/mappings';

export const userFeature = new Composer<BotContext>();

// Security & Performance: Middleware to block banned users via fast cache
userFeature.use(async (ctx, next) => {
	const user = ctx.from;
	if (!user) return;

	const isBanned = await checkIsBannedCached(ctx.env.DB, user.id);
	if (isBanned) return; 
	
	await next();
});

userFeature.command('start', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	ctx.executionCtx.waitUntil(saveUser(ctx.env.DB, user.id, user.first_name, user.username).catch(console.error));

	await ctx.reply(
		`👋 <b>Hello, ${user.first_name}!</b>\n\n` +
		`I am the support bot. Send me any message, question, or media, and the support team will get back to you.`,
		{ parse_mode: 'HTML' }
	);
});

// UX Fix: Inform user about edited messages
userFeature.on('edited_message', async (ctx) => {
	await ctx.reply('⚠️ Please send a new message instead of editing. The support team might not see edited messages.');
});

// Forward all incoming messages to admin
userFeature.on('message', async (ctx) => {
	const user = ctx.from;
	if (!user) return;

	const userLink = user.username ? `@${user.username}` : `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
	const headerText = `📨 <b>New Ticket</b>\n👤 From: ${userLink}\n🆔 ID: <code>${user.id}</code>\n\n`;

	// UI/UX Upgrade: Interactive admin actions directly on the ticket
	const adminKeyboard = new InlineKeyboard()
		.text('🚫 Ban', `ban_${user.id}`)
		.text('🟢 Unban', `unban_${user.id}`);

	try {
		const headerMsg = await ctx.api.sendMessage(ctx.env.ADMIN_CHAT_ID, headerText, { 
			parse_mode: 'HTML',
			reply_markup: adminKeyboard 
		});
		
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
