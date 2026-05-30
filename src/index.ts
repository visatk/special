import { webhookCallback } from 'grammy';
import { createBot } from './bot';
import { Env } from './types';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/webhook') {
			// Security: Validate the incoming webhook request
			const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
			if (secretToken !== env.WEBHOOK_SECRET) {
				return new Response('Unauthorized', { status: 403 });
			}

			const bot = createBot(env);
			const handleUpdate = webhookCallback(bot, 'cloudflare-mod');
			
			// Process the update
			return handleUpdate(request);
		}

		// A simple health check endpoint
		return new Response('Rose Bot is running optimally.', { status: 200 });
	},
} satisfies ExportedHandler<Env>;
