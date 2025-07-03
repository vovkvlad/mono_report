# Telegram Group Chat Bot

A Node.js Telegram bot that sends periodic messages to a group chat.

## Start the app
```bash
docker build -t telegram-mono-report-bot .
docker run -d -v $(pwd)/data:/usr/src/app/data telegram-mono-report-bot 
```

for development purposes run 
```bash
docker run -it --rm -v $(pwd)/src:/usr/src/app/src -v $(pwd)/data:/usr/src/app/data telegram-mono-report-bot sh
```

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Create a Telegram bot:
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Use the `/newbot` command to create a new bot
   - Save the bot token you receive

3. Configure the bot:
   - Copy the `.env` file to `.env.local`
   - Fill in the following variables:
     - `TELEGRAM_BOT_TOKEN`: Your bot token from BotFather
     - `GROUP_CHAT_ID`: The ID of your group chat
     - `CRON_SCHEDULE`: The schedule for sending messages (default: every 3 days)
     - `MESSAGE`: The message to send

4. Add the bot to your group:
   - Add the bot to your group chat
   - Make the bot an administrator in the group

## Usage

Start the bot:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Cron Schedule Configuration

The bot uses node-cron for scheduling. The default schedule is `0 0 */3 * *` which means:
- Run at minute 0
- Run at hour 0 (midnight)
- Every 3 days
- Every month
- Every day of the week

You can modify this in the `.env` file using standard cron syntax.

## Troubleshooting

- Make sure the bot is an administrator in the group
- Verify the group chat ID is correct
- Check that the bot token is valid
- Ensure the cron schedule is properly formatted 