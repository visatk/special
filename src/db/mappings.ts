import { Env } from '../types';

// D1 Best Practice: Retry write queries for transient errors (Exponential Backoff with Jitter)
async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
	let attempt = 0;
	while (attempt < maxRetries) {
		try {
			return await operation();
		} catch (error: any) {
			const errMsg = String(error);
			// Identify retryable errors from Cloudflare D1
			const isRetryable =
				errMsg.includes('Network connection lost') ||
				errMsg.includes('storage caused object to be reset') ||
				errMsg.includes('reset because its code was updated') ||
				errMsg.includes('SQLITE_BUSY') ||
				errMsg.includes('busy') ||
				errMsg.includes('D1_');

			if (++attempt >= maxRetries || !isRetryable) {
				throw error;
			}
			
			// Exponential backoff: 50ms, 100ms, 200ms + jitter
			const delay = Math.pow(2, attempt) * 50 + Math.random() * 50;
			await new Promise((res) => setTimeout(res, delay));
		}
	}
	throw new Error('Unreachable');
}

export async function saveUser(db: Env['DB'], telegramId: number, firstName?: string, username?: string): Promise<void> {
	const stmt = db.prepare(
		`INSERT INTO users (telegram_id, first_name, username) 
         VALUES (?, ?, ?) 
         ON CONFLICT(telegram_id) DO UPDATE SET 
         first_name = excluded.first_name, 
         username = excluded.username`
	).bind(telegramId, firstName ?? null, username ?? null);
	
	await executeWithRetry(() => stmt.run());
}

export async function getUser(db: Env['DB'], telegramId: number) {
	// D1 automatically retries read queries up to 2 times, so manual retry is not needed here
	const stmt = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
	return await stmt.bind(telegramId).first<{ telegram_id: number; is_banned: number; first_name: string; username: string }>();
}

export async function setBanStatus(db: Env['DB'], telegramId: number, isBanned: number): Promise<void> {
	const stmt = db.prepare(`UPDATE users SET is_banned = ? WHERE telegram_id = ?`).bind(isBanned, telegramId);
	await executeWithRetry(() => stmt.run());
}

export async function getStats(db: Env['DB']) {
	// D1 Best Practice: Use db.batch() for multiple read queries to reduce network round-trips
	const batch = await db.batch<{ count: number }>([
		db.prepare(`SELECT COUNT(*) as count FROM users`),
		db.prepare(`SELECT COUNT(*) as count FROM message_mappings`),
	]);

	return {
		totalUsers: batch[0].results?.[0]?.count || 0,
		totalMessages: batch[1].results?.[0]?.count || 0,
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
	
	// db.batch acts as a single SQL transaction. If one insert fails, everything is rolled back securely.
	await executeWithRetry(() => db.batch(statements));
}

export async function getMessageMapping(db: Env['DB'], adminMessageId: number) {
	const stmt = db.prepare(`SELECT user_telegram_id, user_message_id FROM message_mappings WHERE admin_message_id = ?`);
	return await stmt.bind(adminMessageId).first<{ user_telegram_id: number; user_message_id: number }>();
}
