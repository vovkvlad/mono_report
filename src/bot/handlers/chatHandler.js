const { generateResidualReport } = require('../../report/report');
const logger = require('../../logger');

class ChatHandler {
    constructor(bot) {
        this.bot = bot;
        this.activeChats = new Set();
        this.currentSchedule = null;
    }

    async handleNewChatMember(msg, botId) {
        if (botId && msg.new_chat_members.some(member => member.id === botId)) {
            const chatId = msg.chat.id;
            this.activeChats.add(chatId);
            await this.bot.sendMessage(
                chatId,
                `👋 Hello! I'm your periodic message bot.\n\n` +
                `Current schedule: \`${this.currentSchedule}\`\n` +
                `Use /cron to change the schedule.\n\n` +
                `You can use [crontab.guru](https://crontab.guru/) to help create your schedule.`,
                { parse_mode: 'Markdown' }
            );
        }
    }

    async handleLeftChatMember(msg, botId) {
        if (botId && msg.left_chat_member.id === botId) {
            const chatId = msg.chat.id;
            this.activeChats.delete(chatId);
            logger.info(`Bot removed from chat ${chatId}`);
        }
    }

    getActiveChats() {
        return this.activeChats;
    }

    addActiveChat(chatId) {
        this.activeChats.add(chatId);
    }

    setCurrentSchedule(schedule) {
        this.currentSchedule = schedule;
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
            
            if(this.activeChats.size === 0) {
                logger.info('No active chats found');
                return;
            }

            for (const chatId of this.activeChats) {
                try {
                    this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } catch (error) {
                    logger.error(`Failed to send message to chat ${chatId}:`, error);
                    if (error.response && error.response.statusCode === 403) {
                        this.activeChats.delete(chatId);
                        logger.info(`Removed chat ${chatId} from active chats`);
                    }
                }
            }
        } catch (error) {
            logger.error('Error sending periodic update:', error);
        }
    }
}

module.exports = ChatHandler; 