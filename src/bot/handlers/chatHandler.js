const { generateResidualReport } = require('../../report/report');
const logger = require('../../logger');
const fs = require('fs');
const path = require('path');

class ChatHandler {
    constructor (bot) {
        this.bot = bot;
        this.activeChats = new Set();
        this.currentSchedule = null;
        this.botUsername = null;
        this.activeChatsFile = path.join(process.cwd(), 'data', 'activeChats.json');
        
        // Initialize storage and load active chats
        this.initializeStorage();
        // Load active chats from file
        this.loadActiveChats();
    }

    /**
     * Set the bot username for use in welcome messages
     */
    setBotUsername(username) {
        this.botUsername = username;
    }

    /**
     * Initialize storage directory and load active chats
     */
    initializeStorage() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.activeChatsFile);
            fs.mkdirSync(dataDir, { recursive: true });
            logger.debug('Data directory initialized');
            
            // Create an empty file if it doesn't exist
            try {
                fs.accessSync(this.activeChatsFile);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    fs.writeFileSync(this.activeChatsFile, JSON.stringify([], null, 2));
                    logger.debug('Created empty active chats file');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            logger.error(['Error initializing storage:', error]);
        }
    }

    /**
     * Load active chats from file
     */
    loadActiveChats() {
        try {
            // Try to read the file
            const data = fs.readFileSync(this.activeChatsFile, 'utf8');
            const chatIds = JSON.parse(data);
            
            // Convert array back to Set
            this.activeChats = new Set(chatIds);
            logger.info(`Loaded ${this.activeChats.size} active chats from file`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('No active chats file found, starting with empty set');
            } else {
                logger.error(['Error loading active chats:', error]);
            }
        }
    }

    /**
     * Save active chats to file
     */
    saveActiveChats() {
        try {
            // Convert Set to array and save as JSON
            const chatIds = Array.from(this.activeChats);
            fs.writeFileSync(this.activeChatsFile, JSON.stringify(chatIds, null, 2));
            logger.debug(`Saved ${chatIds.length} active chats to file`);
        } catch (error) {
            logger.error(['Error saving active chats:', error]);
        }
    }

    async handleNewChatMember(msg, botId) {
        if (botId && msg.new_chat_members.some(member => member.id === botId)) {
            const chatId = msg.chat.id;
            this.addActiveChat(chatId);
            
            const botMention = this.botUsername ? `@${this.botUsername}` : '@bot_name';
            
            await this.bot.sendMessage(
                chatId,
                `👋 Hello! I'm your periodic message bot.\n\n` +
                `Current schedule: \`${this.currentSchedule}\`\n\n` +
                `**Commands:**\n` +
                `• \`/cron\` or \`${botMention} cron\` - Change schedule\n` +
                `• \`/trigger\` or \`${botMention} trigger\` - Generate report now\n` +
                `• \`/help\` or \`${botMention} help\` - Show all commands\n\n` +
                `You can use [crontab.guru](https://crontab.guru/) to help create your schedule.`,
                { parse_mode: 'Markdown' }
            );
        }
    }

    async handleLeftChatMember(msg, botId) {
        if (botId && msg.left_chat_member.id === botId) {
            const chatId = msg.chat.id;
            this.activeChats.delete(chatId);
            this.saveActiveChats();
            logger.info(`Bot removed from chat ${chatId}`);
        }
    }

    getActiveChats() {
        return this.activeChats;
    }

    addActiveChat(chatId) {
        this.activeChats.add(chatId);
        // Save to file synchronously
        try {
            this.saveActiveChats();
        } catch (error) {
            logger.error(['Failed to save active chats after adding:', error]);
        }
    }

    setCurrentSchedule(schedule) {
        this.currentSchedule = schedule;
    }

    /**
     * Handle trigger command (both direct and mentioned)
     */
    async handleTriggerCommand(msg) {
        try {
            logger.info(`Manual trigger requested by user: ${msg.from.username || msg.from.first_name} (${msg.from.id})`);
            await this.bot.sendMessage(
                msg.chat.id,
                '🔄 Generating financial report...',
                { parse_mode: 'Markdown' }
            );
            await this.sendPeriodicUpdate();
            logger.info('Manual trigger completed successfully');
        } catch (error) {
            logger.error(['Error handling /trigger command:', error]);
            await this.bot.sendMessage(
                msg.chat.id,
                '❌ Error generating report. Please check the logs.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    /**
     * Handle help command (both direct and mentioned)
     */
    async handleHelpCommand(msg) {
        try {
            const botMention = this.botUsername ? `@${this.botUsername}` : '@bot_name';
            const helpMessage = `🤖 **Bot Commands Help**\n\n` +
                `**Available Commands:**\n\n` +
                `🔧 \`/cron\` or \`${botMention} cron\`\n` +
                `   Configure the cron schedule for periodic messages\n\n` +
                `⚡ \`/trigger\` or \`${botMention} trigger\`\n` +
                `   Manually trigger a report generation and send immediately\n\n` +
                `❓ \`/help\` or \`${botMention} help\`\n` +
                `   Show this help message with all available commands\n\n` +
                `📄 \`/statement\` or \`${botMention} statement\`\n` +
                `   Show a chronological statement report for the last week\n\n` +
                `📊 \`/agg_statement\` or \`${botMention} agg_statement\`\n` +
                `   Show an aggregated statement report (max to min spending) for the last week\n\n` +
                `**Current Schedule:** \`${this.currentSchedule}\`\n\n` +
                `💡 You can use [crontab.guru](https://crontab.guru/) to help create your schedule.`;
            await this.bot.sendMessage(
                msg.chat.id,
                helpMessage,
                { parse_mode: 'Markdown' }
            );
            logger.info(`Help command executed for user: ${msg.from.username || msg.from.first_name} (${msg.from.id})`);
        } catch (error) {
            logger.error(['Error handling /help command:', error]);
            await this.bot.sendMessage(
                msg.chat.id,
                '❌ Error displaying help. Please check the logs.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    /**
     * Handle statement command (both direct and mentioned)
     */
    async handleStatementCommand(msg) {
        const { generateChronologicalReport } = require('../../report/report');
        try {
            logger.info(`Statement report requested by user: ${msg.from.username || msg.from.first_name} (${msg.from.id})`);
            await this.bot.sendMessage(
                msg.chat.id,
                '📄 Fetching statement report for the last week...',
                { parse_mode: 'Markdown' }
            );
            const transactions = await generateChronologicalReport();
            if (!transactions.length) {
                await this.bot.sendMessage(msg.chat.id, 'No transactions found for the last week.');
                return;
            }
            const message = '*📄 Statement Report (Chronological)*\n\n' +
                transactions.map(tx =>
                    `📅 *${tx.localTime}*\n    ${tx.description || 'No description'}\n💵 Amount: ${tx.parsedAmount} ${tx.currency}\n💰 Balance: ${tx.parsedBalance} ${tx.currency}`
                ).join('\n\n');
            await this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error(['Error handling statement command:', error]);
            await this.bot.sendMessage(
                msg.chat.id,
                '❌ Error generating statement report. Please check the logs.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    /**
     * Handle agg_statement command (both direct and mentioned)
     */
    async handleAggStatementCommand(msg) {
        const { generateMaxToMinReport } = require('../../report/report');
        try {
            logger.info(`Aggregated statement report requested by user: ${msg.from.username || msg.from.first_name} (${msg.from.id})`);
            await this.bot.sendMessage(
                msg.chat.id,
                '📊 Fetching aggregated statement report for the last week...',
                { parse_mode: 'Markdown' }
            );
            const transactions = await generateMaxToMinReport();
            if (!transactions.length) {
                await this.bot.sendMessage(msg.chat.id, 'No spending transactions found for the last week.');
                return;
            }
            const message = '*📊 Aggregated Statement Report (Max to Min Spending)*\n\n' +
                transactions.map(tx =>
                    `📅 *${tx.localTime}*\n    ${tx.description || 'No description'}\n💵 Amount: ${tx.parsedAmount} ${tx.currency}\n💰 Balance: ${tx.parsedBalance} ${tx.currency}`
                ).join('\n\n');
            await this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error(['Error handling agg_statement command:', error]);
            await this.bot.sendMessage(
                msg.chat.id,
                '❌ Error generating aggregated statement report. Please check the logs.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    /**
     * Send a periodic update with residual balance and spending limits to all active chats
     */
    async sendPeriodicUpdate() {
        try {
            const report = await generateResidualReport();
            const message = `💰 *Financial Update*\n\n` +
                `*Current Balance:* ${report.residual.toFixed(2)} UAH\n\n` +
                `*Time Remaining:*\n` +
                `• ${report.daysRemaining} days left in the month\n` +
                `• ${report.weeksRemaining} weeks left\n\n` +
                `*Spending Limits:*\n` +
                `• Daily: ${report.dailyLimit.toFixed(2)} UAH\n` +
                `• Weekly: ${report.weeklyLimit.toFixed(2)} UAH`;

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Report', callback_data: 'statement_report' },
                            { text: 'MaxToMin Report', callback_data: 'agg_statement_report' }
                        ]
                    ]
                },
                parse_mode: 'Markdown'
            };
            
            if(this.activeChats.size === 0) {
                logger.info('No active chats found');
                return;
            }

            for (const chatId of this.activeChats) {
                try {
                    this.bot.sendMessage(chatId, message, keyboard);
                } catch (error) {
                    logger.error([`Failed to send message to chat ${chatId}:`, error]);
                    if (error.response && error.response.statusCode === 403) {
                        logger.error(`Removing chat ${chatId} from active chats because of 403 error`);
                        this.activeChats.delete(chatId);
                        this.saveActiveChats();
                        logger.info(`Removed chat ${chatId} from active chats`);
                    }
                }
            }
        } catch (error) {
            logger.error(['Error sending periodic update:', error]);
        }
    }

    /**
     * Handle callback queries for inline keyboard buttons
     */
    async handleCallbackQuery(msg) {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        if (data === 'statement_report') {
            await this.handleStatementCommand({ chat: { id: chatId }, from: msg.from });
        } else if (data === 'agg_statement_report') {
            await this.handleAggStatementCommand({ chat: { id: chatId }, from: msg.from });
        }
    }
}

module.exports = ChatHandler; 