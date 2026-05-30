import { Composer, GrammyError } from 'grammy';
import { BotContext } from '../types';
import { getMessageMapping, getStats, setBanStatus, getAllUserIds } from '../db/mappings';

export const adminFeature = new Composer<BotContext>();

adminFeature.command('start', async (ctx) => {
	const text = `👨‍💻 <b>Admin Panel Online</b>\n\n` +
		`<b>Commands:</b>\n` +
		`• /stats - Bot statistics\n` +
		`• /broadcast &lt;msg&gt; - Message all users\n\n` +
		`<b>Moderation:</b>\n` +
		`Reply to a user's message with <code>/ban</code> or <code>/unban</code>.`;
	await ctx.reply(text, { parse_mode: 'HTML' });
});

adminFeature.command('stats', async (ctx) => {
	try {
		const stats = await getStats(ctx.env.DB);
		await ctx.reply(`📊 <b>Statistics</b>\n\n👥 Users: <code>${stats.totalUsers}</code>\n📨 Messages: <code>${stats.totalMessages}</code>`, { parse_mode: 'HTML' });
	} catch (error) {
		console.error("Stats Error:", error);
		await ctx.reply('❌ Failed to fetch stats.');
	}
});

adminFeature.command('broadcast', async (ctx) => {
	const message = ctx.match;
	if (!message) return ctx.reply('⚠️ Provide a message. Example: <code>/broadcast Hello!</code>', { parse_mode: 'HTML' });

	const confirmation = await ctx.reply('⏳ <b>Broadcasting...</b>', { parse_mode: 'HTML' });
	
	try {
		const userIds = await getAllUserIds(ctx.env.DB);
		
		// Run in background and safely catch any unhandled promise rejections
		ctx.executionCtx.waitUntil(
			(async () => {
				let success = 0; let failed = 0;
				for (const id of userIds) {
					try {
						await ctx.api.sendMessage(id, `📢 <b>Announcement</b>\n\n${message}`, { parse_mode: 'HTML' });
						success++;
					} catch (e) { failed++; }
					// Respect Telegram's 30 msgs/sec rate limit
					await new Promise(res => setTimeout(res, 35)); 
				}
				await ctx.api.editMessageText(ctx.chat.id, confirmation.message_id, `✅ <b>Broadcast Done!</b>\n🟢 Success: ${success}\n🔴 Failed: ${failed}`, { parse_mode: 'HTML' });
			})().catch(err => console.error("Broadcast failed in background:", err))
		);
	} catch (error) {
		await ctx.api.editMessageText(ctx.chat.id, confirmation.message_id, '❌ Broadcast failed to initialize.');
	}
});

adminFeature.command(['ban', 'unban'], async (ctx) => {
	const replyTo = ctx.message?.reply_to_message;
	if (!replyTo) return ctx.reply('⚠️ Reply to a user message first.');

	const mapping = await getMessageMapping(ctx.env.DB, replyTo.message_id);
	if (!mapping) return ctx.reply('⚠️ User not found.');

	const isBan = ctx.message.text.startsWith('/ban');
	try {
		await setBanStatus(ctx.env.DB, mapping.user_telegram_id, isBan ? 1 : 0);
		await ctx.reply(`✅ User <code>${mapping.user_telegram_id}</code> <b>${isBan ? 'Banned 🚫' : 'Unbanned 🟢'}</b>.`, { parse_mode: 'HTML' });
	} catch (error) {
		console.error("Ban Error:", error);
		await ctx.reply('❌ Database error.');
	}
});

adminFeature.on('message', async (ctx) => {
	const replyTo = ctx.message.reply_to_message;
	if (!replyTo) return;

	try {
		const mapping = await getMessageMapping(ctx.env.DB, replyTo.message_id);
		if (!mapping) return; 

		await ctx.copyMessage(mapping.user_telegram_id, {
			reply_parameters: { message_id: mapping.user_message_id },
		});

		const confirmation = await ctx.reply('✅ Sent.', { reply_parameters: { message_id: ctx.message.message_id } });
		setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, confirmation.message_id).catch(() => {}), 3000);
	} catch (error) {
		if (error instanceof GrammyError && error.error_code === 403) {
			await ctx.reply('❌ Failed: User blocked the bot.');
		}
	}
});
