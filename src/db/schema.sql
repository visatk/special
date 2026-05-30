DROP TABLE IF EXISTS users;
CREATE TABLE users (
    telegram_id INTEGER PRIMARY KEY,
    first_name TEXT,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS message_mappings;
CREATE TABLE message_mappings (
    admin_message_id INTEGER PRIMARY KEY,
    user_telegram_id INTEGER NOT NULL,
    user_message_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_telegram_id ON message_mappings(user_telegram_id);
