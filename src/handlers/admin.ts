import { Composer, GrammyError, InlineKeyboard } from 'grammy';
import { BotContext } from '../types';
import { getMessageMapping, getStats, setBanStatus, getAllUserIds, clearUserCache } from '../db/mappings';

export const adminFeature = new Composer<BotContext>();

adminFeature.command('start', async (ctx) => {
	const text = `👨‍💻 <b>Admin Panel Online</b>\n\n` +
		`<b>Commands:</b>\n` +
		`• /stats - Bot statistics\n` +
		`• /broadcast &lt;msg&gt; - Message all active users\n\n` +
		`<b>Moderation:</b>\n` +
		`Use the interactive buttons under new tickets to Ban/Unban users, or simply reply to their messages to respond.`;
	await ctx.reply(text, { parse_mode: 'HTML' });
});

adminFeature.command('stats', async (ctx) => {
	try {
		const stats = await getStats(ctx.env.DB);
		await ctx.reply(`📊 <b>Statistics</b>\n\n👥 Active Users: <code>${stats.totalUsers}</code>\n📨 Total Messages: <code>${stats.totalMessages}</code>`, { parse_mode: 'HTML' });
	} catch (error) {
		await ctx.reply('❌ Failed to fetch stats.');
	}
});

// Broadcast Engine: Optimized for Cloudflare Workers & Telegram Rate Limits
adminFeature.command('broadcast', async (ctx) => {
	const message = ctx.match;
	if (!message) return ctx.reply('⚠️ Provide a message. Example: <code>/broadcast Hello!</code>', { parse_mode: 'HTML' });

	const confirmation = await ctx.reply('⏳ <b>Broadcasting...</b>', { parse_mode: 'HTML' });
	
	try {
		const userIds = await getAllUserIds(ctx.env.DB);
		
		ctx.executionCtx.waitUntil(
			(async () => {
				let success = 0; let failed = 0;
				const chunkSize = 25; // Send 25 messages concurrently per second

				for (let i = 0; i < userIds.length; i += chunkSize) {
					const chunk = userIds.slice(i, i + chunkSize);
					
					await Promise.all(chunk.map(async (id) => {
						try {
							await ctx.api.sendMessage(id, `📢 <b>Announcement</b>\n\n${message}`, { parse_mode: 'HTML' });
							success++;
						} catch (e) {
							failed++;
						}
					}));

					if (i + chunkSize < userIds.length) {
						await new Promise(res => setTimeout(res, 1000)); // Crucial for Rate Limit
					}
				}
				await ctx.api.editMessageText(ctx.chat.id, confirmation.message_id, `✅ <b>Broadcast Completed!</b>\n\n🟢 Success: ${success}\n🔴 Failed: ${failed}`, { parse_mode: 'HTML' });
			})().catch(err => console.error("Broadcast failed in background:", err))
		);
	} catch (error) {
		await ctx.api.editMessageText(ctx.chat.id, confirmation.message_id, '❌ Broadcast failed to initialize.');
	}
});

// Interactive Ban/Unban Callbacks
adminFeature.callbackQuery(/^ban_(\d+)$/, async (ctx) => {
	const userId = parseInt(ctx.match[1]);
	await setBanStatus(ctx.env.DB, userId, 1);
	clearUserCache(userId); // Invalidate cache immediately
	
	await ctx.answerCallbackQuery('User banned 🚫');
	const keyboard = new InlineKeyboard().text('🟢 Unban', `unban_${userId}`);
	await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
});

adminFeature.callbackQuery(/^unban_(\d+)$/, async (ctx) => {
	const userId = parseInt(ctx.match[1]);
	await setBanStatus(ctx.env.DB, userId, 0);
	clearUserCache(userId);
	
	await ctx.answerCallbackQuery('User unbanned 🟢');
	const keyboard = new InlineKeyboard().text('🚫 Ban', `ban_${userId}`);
	await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
});

// Seamless Reply Engine
adminFeature.on('message', async (ctx) => {
	const replyTo = ctx.message.reply_to_message;
	if (!replyTo) return;

	try {
		const mapping = await getMessageMapping(ctx.env.DB, replyTo.message_id);
		if (!mapping) return; 

		await ctx.copyMessage(mapping.user_telegram_id, {
			reply_parameters: { message_id: mapping.user_message_id },
		});

		const confirmation = await ctx.reply('✅ Reply delivered.', { reply_parameters: { message_id: ctx.message.message_id } });
		setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, confirmation.message_id).catch(() => {}), 3000);
	} catch (error: any) {
		if (error instanceof GrammyError && error.error_code === 403) {
			await ctx.reply('❌ Delivery Failed: The user has blocked the bot.');
		} else {
			await ctx.reply('❌ System Error: Could not deliver the message.');
		}
	}
});
