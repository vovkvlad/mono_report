# Telegram Group Chat Bot

A Node.js Telegram bot that sends periodic messages with monobank finance report to a group chat.

## Features

- **Periodic Financial Reports**: Automatically sends financial updates based on a configurable schedule
- **Manual Report Triggering**: Generate reports on-demand
- **Transaction Statements**: View chronological or aggregated transaction reports for the last week
- **Interactive Buttons**: Quick access to detailed reports via inline keyboard buttons
- **Admin Controls**: Cron schedule management restricted to group administrators

## Bot Commands

The bot supports both direct commands (using `/`) and mentions (using `@bot_name`) for group chat compatibility:

- `/cron` or `@bot_name cron` - Configure the cron schedule for periodic messages (admin only)
- `/trigger` or `@bot_name trigger` - Manually trigger a report generation and send it immediately
- `/statement` or `@bot_name statement` - Show a chronological statement report for the last week
- `/agg_statement` or `@bot_name agg_statement` - Show an aggregated statement report (max to min spending) for the last week
- `/help` or `@bot_name help` - Show all available commands with descriptions

### Interactive Features

When periodic or manual reports are sent, they include interactive buttons:
- **Report** - Shows chronological transaction statement for the last week
- **MaxToMin Report** - Shows spending transactions sorted from largest to smallest

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
     - `CRON_SCHEDULE`: The schedule for sending messages (default: every 3 days)
     - `MONOBANK_API_KEY` - API key for monobank API usage
     - `IBAN_TO_FETCH` - which financial account to use for statistics
     - `TIMEZONE` - Timezone for local time display (optional, defaults to Europe/Kiev)

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

## API Rate Limiting

The bot implements a 2-minute cache for Monobank API statement calls to respect the API's rate limiting of 1 request per minute.

## Troubleshooting

- Make sure the bot is an administrator in the group
- Verify the group chat ID is correct
- Check that the bot token is valid
- Ensure the cron schedule is properly formatted
- Verify your Monobank API key is valid and has the necessary permissions 