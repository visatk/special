import { Composer, GrammyError } from 'grammy';
import { BotContext } from '../types';
import { getMessageMapping } from '../db/mappings';

export const adminFeature = new Composer<BotContext>();

// Admin Help Command
adminFeature.command('start', async (ctx) => {
	await ctx.reply('👨‍💻 <b>Admin Panel Online.</b>\nReply to any forwarded user message to send them a response.', { parse_mode: 'HTML' });
});

// Handle Admin Replies
adminFeature.on('message', async (ctx) => {
	const replyTo = ctx.message.reply_to_message;
	if (!replyTo) return;

	try {
		const mapping = await getMessageMapping(ctx.env.DB, replyTo.message_id);
		if (!mapping) return; // Not a user message

		// UX Upgrade: Use reply_parameters to reply contextually to the user's exact message
		await ctx.copyMessage(mapping.user_telegram_id, {
			reply_parameters: { message_id: mapping.user_message_id },
		});

		// UI/UX: Self-destructing confirmation to keep admin group clean
		const confirmation = await ctx.reply('✅ Sent securely to the user.', {
			reply_parameters: { message_id: ctx.message.message_id },
		});

		setTimeout(() => {
			ctx.api.deleteMessage(ctx.chat.id, confirmation.message_id).catch(() => {});
		}, 3000);
	} catch (error) {
		if (error instanceof GrammyError && error.error_code === 403) {
			await ctx.reply('❌ Delivery Failed: The user has blocked the bot.');
		} else {
			console.error('Reply error:', error);
			await ctx.reply('❌ System Error: Could not deliver the message.');
		}
	}
});
