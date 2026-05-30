# 🌹 Feedback bot for Telegram, Private Support Bot.

A high-performance, serverless Telegram Support/Feedback bot built with [Grammy](https://grammy.dev/), TypeScript, and Cloudflare Workers. It acts as a bridge between users and an admin team, featuring real-time forwarding, background background tasks, admin broadcasting, and interactive moderation tools.

## ✨ Features

- **Serverless & Fast:** Runs on Cloudflare Workers edge network with zero cold starts.
- **Zero-Latency Responses:** Uses `ctx.executionContext.waitUntil()` to offload database writes to the background.
- **Secure Webhooks:** Implements constant-time string comparison to prevent timing attacks on the webhook endpoint.
- **D1 Database Powered:** Uses Cloudflare's serverless SQLite database (D1) with optimized batched queries and retry logic.
- **Smart Caching:** Uses Worker Isolate memory caching for fast user moderation checks.
- **Interactive Admin Panel:** Inline buttons for instant Ban/Unban actions.
- **Concurrent Broadcasting:** Admins can securely broadcast messages to all active users without hitting Telegram API rate limits.

## 🛠️ Project Structure

```text
rose/
├── src/
│   ├── db/
│   │   ├── schema.sql         # D1 Database Schema
│   │   └── mappings.ts        # Optimized D1 queries & cache logic
│   ├── handlers/
│   │   ├── user.ts            # Standard user interactions
│   │   └── admin.ts           # Admin panel & broadcasting logic
│   ├── types/
│   │   └── index.ts           # Custom context & env types
│   ├── bot.ts                 # Bot configuration and routing
│   └── index.ts               # Cloudflare Worker entrypoint & Webhook security
├── package.json
├── tsconfig.json
└── wrangler.jsonc             # Cloudflare configuration
```

## 🚀 Deployment Guide

Follow these steps to deploy the bot to your Cloudflare account.

### 1. Prerequisites
- Node.js installed on your machine.
- A Cloudflare Account.
- A Telegram Bot Token from [@BotFather](https://t.me/botfather).
- An Admin Group ID or your personal Telegram ID.

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Cloudflare D1 Database
Create a new D1 database in your Cloudflare account:
```bash
npx wrangler d1 create bot
```
*Copy the generated `database_id` and paste it into your `wrangler.jsonc` file.*

Apply the database schema:
```bash
npx wrangler d1 execute bot --file=./src/db/schema.sql --remote
```

### 4. Configure Environment Variables
Add your Admin Chat ID to `wrangler.jsonc`:
```jsonc
"vars": {
  "ADMIN_CHAT_ID": "-1001234567890" // Replace with your group/user ID
}
```

Set up secure secrets in Cloudflare:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your BotFather token

npx wrangler secret put WEBHOOK_SECRET
# Create a strong random password/string (e.g., my_super_secret_123)
```

### 5. Deploy to Cloudflare
Deploy the worker:
```bash
npm run deploy
```
*After deployment, Wrangler will output your Worker URL (e.g., `https://rose.your-subdomain.workers.dev`). Keep this handy.*

### 6. Set Telegram Webhook
To connect Telegram to your Cloudflare Worker, open your browser and navigate to the following URL (replace the bracketed values with your actual data):

```text
https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>/webhook&secret_token=<YOUR_WEBHOOK_SECRET>
```

You should see `{"ok":true,"result":true,"description":"Webhook was set"}`.

## 👨‍💻 Usage & Commands

**For Users:**
- Just send a message to the bot. It will securely forward it to the admin team.

**For Admins (In the Admin Group):**
- `/start` - View available admin commands.
- `/stats` - View total active users and handled messages.
- `/broadcast <message>` - Send an announcement to all unbanned users.
- Use the **Ban/Unban inline buttons** under new user tickets to manage access.
- Simply **Reply** to any forwarded ticket to send a message back to the user.

## 🛡️ Security
This bot verifies the `X-Telegram-Bot-Api-Secret-Token` header on every incoming request using a custom timing-safe comparison algorithm to guarantee that only Telegram can trigger your webhook.

---
*Built with ❤️ using Cloudflare Workers & Grammy.*
