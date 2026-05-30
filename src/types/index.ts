import { Context } from 'grammy';

export interface Env {
	DB: D1Database;
	MASTER_BOT_TOKEN: string;
	WEBHOOK_DOMAIN: string;
}

export type BotContext = Context & {
	env: Env;
	executionCtx: ExecutionContext;
};
