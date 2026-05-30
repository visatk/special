import { Context } from 'grammy';

export interface Env {
	DB: D1Database;
	TELEGRAM_BOT_TOKEN: string;
	WEBHOOK_SECRET: string;
}

export type BotContext = Context & {
	env: Env;
	executionCtx: ExecutionContext;
};
