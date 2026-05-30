import { Env } from '../types';

export interface User {
	id: number;
	telegram_id: number;
	username: string | null;
	first_name: string | null;
	created_at: string;
}

export async function saveUser(db: Env['DB'], telegramId: number, username?: string, firstName?: string): Promise<void> {
	const stmt = db.prepare(
		`INSERT INTO users (telegram_id, username, first_name) 
         VALUES (?, ?, ?) 
         ON CONFLICT(telegram_id) DO UPDATE SET 
         username = excluded.username, 
         first_name = excluded.first_name`
	);
	
	await stmt.bind(telegramId, username ?? null, firstName ?? null).run();
}
