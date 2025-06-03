require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const CronHandler = require('./handlers/cronHandler');
const ChatHandler = require('./handlers/chatHandler');
const logger = require('../logger');

class Bot {
    constructor() {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        this.cronHandler = new CronHandler(this.bot);
        this.chatHandler = new ChatHandler(this.bot);
    }

    async initialize() {
        try {
            // Get bot information
            const botInfo = await this.bot.getMe();
            this.botId = botInfo.id;
            logger.info(`Bot initialized with ID: ${this.botId}`);
            
            this.setupHandlers();
            this.setupCronService();

            logger.info('Bot initialized successfully!');
            return botInfo;
        } catch (error) {
            logger.error(['Error initializing bot:', error]);
            throw error;
        }
    }

    setupHandlers() {
        // Handle /cron command
        this.bot.onText(/\/cron/, (msg) => this.cronHandler.handleCronCommand(msg));

        // Handle messages for cron schedule updates
        this.bot.on('message', (msg) => {
            logger.info(`Message received: ${JSON.stringify({ from: msg?.from?.username, text: msg?.text })}`);
            // if there is no current chat in active chat ids but we received a message - let's add it
            if(!this.chatHandler.getActiveChats().has(msg.chat.id)) {
                this.chatHandler.addActiveChat(msg.chat.id);
            }
            this.cronHandler.handleCronSchedule(msg)
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