import { Env } from '../types';

export async function saveUser(db: Env['DB'], telegramId: number, firstName?: string, username?: string): Promise<void> {
	const stmt = db.prepare(
		`INSERT INTO users (telegram_id, first_name, username) 
         VALUES (?, ?, ?) 
         ON CONFLICT(telegram_id) DO UPDATE SET 
         first_name = excluded.first_name, 
         username = excluded.username`
	);
	await stmt.bind(telegramId, firstName ?? null, username ?? null).run();
}

export async function saveMessageMappingsBatch(
	db: Env['DB'],
	userTelegramId: number,
	userMessageId: number,
	adminMessageIds: number[]
): Promise<void> {
	// Performance: Use D1 batching to insert multiple rows in a single network request
	const statements = adminMessageIds.map((adminMsgId) =>
		db
			.prepare(`INSERT INTO message_mappings (admin_message_id, user_telegram_id, user_message_id) VALUES (?, ?, ?)`)
			.bind(adminMsgId, userTelegramId, userMessageId)
	);

	await db.batch(statements);
}

export async function getMessageMapping(db: Env['DB'], adminMessageId: number) {
	const stmt = db.prepare(`SELECT user_telegram_id, user_message_id FROM message_mappings WHERE admin_message_id = ?`);
	return await stmt.bind(adminMessageId).first<{ user_telegram_id: number; user_message_id: number }>();
}
