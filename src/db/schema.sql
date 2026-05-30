-- Creators who use the bot builder
DROP TABLE IF EXISTS creators;
CREATE TABLE creators (
    telegram_id INTEGER PRIMARY KEY,
    first_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registered Bots in the system
DROP TABLE IF EXISTS bots;
CREATE TABLE bots (
    token TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    bot_username TEXT NOT NULL,
    welcome_text TEXT DEFAULT 'Hello! Send your message and we will reply soon.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES creators(telegram_id)
);

-- Message routing map for ALL child bots
DROP TABLE IF EXISTS message_mappings;
CREATE TABLE message_mappings (
    admin_message_id INTEGER PRIMARY KEY,
    bot_token TEXT NOT NULL,
    user_telegram_id INTEGER NOT NULL,
    user_message_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bot_token ON message_mappings(bot_token);
