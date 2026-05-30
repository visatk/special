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

export async function saveMessageMapping(
	db: Env['DB'],
	adminMessageId: number,
	userTelegramId: number,
	userMessageId: number
): Promise<void> {
	const stmt = db.prepare(
		`INSERT INTO message_mappings (admin_message_id, user_telegram_id, user_message_id) VALUES (?, ?, ?)`
	);
	await stmt.bind(adminMessageId, userTelegramId, userMessageId).run();
}

export async function getMessageMapping(db: Env['DB'], adminMessageId: number) {
	const stmt = db.prepare(`SELECT * FROM message_mappings WHERE admin_message_id = ?`);
	return await stmt.bind(adminMessageId).first<{ user_telegram_id: number; user_message_id: number }>();
}
