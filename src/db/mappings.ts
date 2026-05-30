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

export async function getUser(db: Env['DB'], telegramId: number) {
	const stmt = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
	return await stmt.bind(telegramId).first<{ telegram_id: number; is_banned: number; first_name: string; username: string }>();
}

export async function setBanStatus(db: Env['DB'], telegramId: number, isBanned: number): Promise<void> {
	const stmt = db.prepare(`UPDATE users SET is_banned = ? WHERE telegram_id = ?`);
	await stmt.bind(isBanned, telegramId).run();
}

export async function getStats(db: Env['DB']) {
	const usersCount = await db.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>();
	const msgsCount = await db.prepare(`SELECT COUNT(*) as count FROM message_mappings`).first<{ count: number }>();
	return {
		totalUsers: usersCount?.count || 0,
		totalMessages: msgsCount?.count || 0,
	};
}

export async function getAllUserIds(db: Env['DB']) {
	const { results } = await db.prepare(`SELECT telegram_id FROM users WHERE is_banned = 0`).all<{ telegram_id: number }>();
	return results.map((r) => r.telegram_id);
}

export async function saveMessageMappingsBatch(
	db: Env['DB'],
	userTelegramId: number,
	userMessageId: number,
	adminMessageIds: number[]
): Promise<void> {
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
