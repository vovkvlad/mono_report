require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const CronHandler = require('./handlers/cronHandler');
const ChatHandler = require('./handlers/chatHandler');
const logger = require('../logger');
const { generateChronologicalReport, generateMaxToMinReport } = require('../report/report');

class Bot {
    constructor() {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        this.cronHandler = new CronHandler(this.bot);
        this.chatHandler = new ChatHandler(this.bot);
        this.botUsername = null;
    }

    async initialize() {
        try {
            // Get bot information
            const botInfo = await this.bot.getMe();
            this.botId = botInfo.id;
            this.botUsername = botInfo.username;
            logger.info(`Bot initialized with ID: ${this.botId}, Username: @${this.botUsername}`);
            
            // Set bot username in chat handler for welcome messages
            this.chatHandler.setBotUsername(this.botUsername);
            
            this.setupHandlers();
            this.setupCronService();

            logger.info('Bot initialized successfully!');
            return botInfo;
        } catch (error) {
            logger.error(['Error initializing bot:', error]);
            throw error;
        }
    }

    /**
     * Extract command from a mention message
     * Handles formats like "@bot_name cron", "@bot_name /cron", "@bot_name trigger", etc.
     */
    extractCommandFromMention(text, entities) {
        if (!entities || !this.botUsername) return null;

        // Find mention entities that mention this bot
        const botMention = entities.find(entity => 
            entity.type === 'mention' && 
            text.substring(entity.offset, entity.offset + entity.length) === `@${this.botUsername}`
        );

        if (!botMention) return null;

        // Get text after the mention
        const afterMention = text.substring(botMention.offset + botMention.length).trim();
        
        // Extract command (remove leading slash if present)
        const command = afterMention.split(' ')[0].replace(/^\//, '');
        
        return command || null;
    }

    /**
     * Handle cron command (both direct and mentioned)
     */
    async handleCronCommand(msg) {
        this.cronHandler.handleCronCommand(msg);
    }

    setupHandlers() {
        // Handle /cron command
        this.bot.onText(/\/cron/, (msg) => this.handleCronCommand(msg));

        // Handle /trigger command
        this.bot.onText(/\/trigger/, (msg) => this.chatHandler.handleTriggerCommand(msg));

        // Handle /help command
        this.bot.onText(/\/help/, (msg) => this.chatHandler.handleHelpCommand(msg));

        // Handle /statement command
        this.bot.onText(/\/statement/, (msg) => this.chatHandler.handleStatementCommand(msg));

        // Handle /agg_statement command
        this.bot.onText(/\/agg_statement/, (msg) => this.chatHandler.handleAggStatementCommand(msg));

        // Handle messages for cron schedule updates and mentions
        this.bot.on('message', (msg) => {
            logger.info(`Message received: ${JSON.stringify({ from: msg?.from?.username, text: msg?.text })}`);
            
            // Add chat to active chats if not already present (only in development mode)
            if(process.env.NODE_ENV !== 'production' && !this.chatHandler.getActiveChats().has(msg.chat.id)) {
                this.chatHandler.addActiveChat(msg.chat.id);
            }

            // Check if this is a mention of the bot with a command
            if (msg.entities) {
                const command = this.extractCommandFromMention(msg.text, msg.entities);
                
                if (command) {
                    logger.info(`Command via mention detected: ${command}`);
                    
                    switch (command.toLowerCase()) {
                        case 'cron':
                            this.handleCronCommand(msg);
                            return; // Don't process as regular message
                        case 'trigger':
                            this.chatHandler.handleTriggerCommand(msg);
                            return; // Don't process as regular message
                        case 'help':
                            this.chatHandler.handleHelpCommand(msg);
                            return; // Don't process as regular message
                        case 'statement':
                            this.chatHandler.handleStatementCommand(msg);
                            return;
                        case 'agg_statement':
                            this.chatHandler.handleAggStatementCommand(msg);
                            return;
                        default:
                            // Unknown command via mention - show help
                            logger.info(`Unknown command via mention: ${command}`);
                            this.chatHandler.handleHelpCommand(msg);
                            return;
                    }
                }
            }

            // Handle regular cron schedule updates
            this.cronHandler.handleCronSchedule(msg);
        });

        // Handle chat events
        this.bot.on('new_chat_members', (msg) => this.chatHandler.handleNewChatMember(msg, this.botId));
        this.bot.on('left_chat_member', (msg) => this.chatHandler.handleLeftChatMember(msg, this.botId));
    }

    setupCronService() {
        // Set up the message callback for cron service
        this.cronHandler.setScheduleCallback(async () => {
            try {
                await this.chatHandler.sendPeriodicUpdate();
            } catch (error) {
                logger.error(['Error in cron callback:', error]);
            }
        });

        // Initialize with default schedule
        this.cronHandler.updateSchedule(process.env.CRON_SCHEDULE);
        this.chatHandler.setCurrentSchedule(this.cronHandler.getCurrentSchedule());
    }
}

module.exports = Bot;