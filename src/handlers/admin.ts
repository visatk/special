import { Composer } from 'grammy';
import { BotContext } from '../types';
import { getMessageMapping } from '../db/mappings';

export const adminFeature = new Composer<BotContext>();

adminFeature.on('message', async (ctx) => {
	// Must be a reply to a message
	const replyTo = ctx.message.reply_to_message;
	if (!replyTo) return;

	try {
		// Find who this message originally belonged to
		const mapping = await getMessageMapping(ctx.env.DB, replyTo.message_id);
		
		if (!mapping) {
			// If not found, it might be the header message or an untracked message. Just ignore.
			return; 
		}

		// Copy the admin's reply back to the specific user
		await ctx.copyMessage(mapping.user_telegram_id);
		
		// UX: Confirm to admin that message was sent
		const confirmation = await ctx.reply('✅ Reply sent to user.', { 
			reply_parameters: { message_id: ctx.message.message_id }
		});

		// Auto-delete confirmation after 3 seconds to keep admin chat clean
		setTimeout(() => {
			ctx.api.deleteMessage(ctx.chat.id, confirmation.message_id).catch(() => {});
		}, 3000);

	} catch (error) {
		console.error('Failed to send reply to user:', error);
		await ctx.reply('❌ Failed to send reply. The user might have blocked the bot.');
	}
});
