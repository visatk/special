import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../types';
import { saveUser } from '../db/users';

export function setupCommands(bot: Bot<BotContext>) {
	bot.command('start', async (ctx) => {
		const user = ctx.from;
		if (!user) return;

		// Performance: Offload DB operation to background. 
		// Does NOT block the bot's instant response to the user.
		ctx.executionCtx.waitUntil(
			saveUser(ctx.env.DB, user.id, user.username, user.first_name)
				.catch((error) => console.error('Failed to save user in background:', error))
		);

		// UX/UI: Clean formatting and interactive buttons
		const keyboard = new InlineKeyboard()
			.text('🚀 Get Started', 'action_get_started')
			.row()
			.url('📖 Read Documentation', 'https://example.com/docs');

		const welcomeMessage = 
			`👋 <b>Welcome to Rose Bot, ${user.first_name}!</b>\n\n` +
			`Your profile has been registered securely. What would you like to explore today?`;

		await ctx.reply(welcomeMessage, {
			parse_mode: 'HTML',
			reply_markup: keyboard,
		});
	});

	// UX/UI: Interactive callback query handler
	bot.callbackQuery('action_get_started', async (ctx) => {
		// UX: Answer query immediately to remove the loading state on the button
		await ctx.answerCallbackQuery('Let\'s begin!');
		
		// Edit the current message for a "Single Page App" like experience inside Telegram
		await ctx.editMessageText(
			`🌟 <b>Awesome!</b> Let's get started with your tasks. Use the menu below to navigate.`,
			{ parse_mode: 'HTML' }
		);
	});
}
