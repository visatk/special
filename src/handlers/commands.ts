import { Bot } from 'grammy';
import { BotContext } from '../types';
import { saveUser } from '../db/users';

export function setupCommands(bot: Bot<BotContext>) {
	bot.command('start', async (ctx) => {
		const user = ctx.from;
		if (!user) return;

		try {
			await saveUser(ctx.env.DB, user.id, user.username, user.first_name);
			await ctx.reply(`Welcome to Rose Bot, ${user.first_name}! Your account has been registered.`);
		} catch (error) {
			console.error('Failed to save user:', error);
			await ctx.reply('An error occurred while setting up your profile.');
		}
	});

	bot.command('help', async (ctx) => {
		await ctx.reply('How can I assist you today?');
	});
}
