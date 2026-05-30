import { webhookCallback } from 'grammy';
import { createBot } from './bot';
import { Env } from './types';

// Timing-safe comparison to prevent Timing Attacks
function secureCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; ++i) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Security: Only allow POST requests for webhook
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		const url = new URL(request.url);

		if (url.pathname === '/webhook') {
			const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
			
			// Security: Validate the incoming webhook request securely
			if (!secretToken || !secureCompare(secretToken, env.WEBHOOK_SECRET)) {
				return new Response('Unauthorized', { status: 403 });
			}

			// Pass both Env and ExecutionContext to the bot
			const bot = createBot(env, ctx);
			const handleUpdate = webhookCallback(bot, 'cloudflare-mod');
			
			return handleUpdate(request);
		}

		return new Response('Rose Bot API is active.', { status: 200 });
	},
} satisfies ExportedHandler<Env>;
