const cron = require('node-cron');
const { CHAT_STATES } = require('../constants');
const logger = require('../../logger');

class CronHandler {
    constructor(bot) {
        this.bot = bot;
        this.currentSchedule = null;
        this.cronJob = null;
        this.userStates = new Map();
    }

    /**
     * Handle the /cron command
     * @param {Object} msg - Telegram message object
     */
    handleCronCommand(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Check if user is an admin
        this.bot.getChatMember(chatId, userId)
            .then(member => {
                if (member.status === 'creator' || member.status === 'administrator') {
                    this.userStates.set(chatId, CHAT_STATES.WAITING_FOR_CRON);
                    this.bot.sendMessage(
                        chatId,
                        'Please send me the new cron schedule.\n\n' +
                        'Example: `0 0 */3 * *` (runs every 3 days at midnight)\n\n' +
                        'You can use [crontab.guru](https://crontab.guru/) to help create your schedule.',
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    this.bot.sendMessage(chatId, 'Sorry, only administrators can change the schedule.');
                }
            })
            .catch(error => {
                logger.error(['Error checking admin status:', error.message]);
                this.bot.sendMessage(chatId, 'Sorry, there was an error processing your request.');
            });
    }

    async handleCronSchedule(msg) {
        const chatId = msg.chat.id;
        const state = this.userStates.get(chatId);

        if (state === CHAT_STATES.WAITING_FOR_CRON) {
            this.userStates.delete(chatId); // Clear the state

            const newSchedule = msg.text.trim().split('').join(' ');
            const isValid = this.updateSchedule(newSchedule);

            if (isValid) {
                await this.bot.sendMessage(
                    chatId,
                    `✅ Cron schedule updated successfully!\nNew schedule: \`${newSchedule}\``,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await this.bot.sendMessage(
                    chatId,
                    '❌ Invalid cron schedule. Please try again with a valid cron expression.',
                    { parse_mode: 'Markdown' }
                );
            }
        }
    }

    updateSchedule(newSchedule) {
        // Cancel existing cron job if it exists
        if (this.cronJob) {
            this.cronJob.stop();
        }

        try {
            // Validate the cron schedule
            const isValid = cron.validate(newSchedule);
            if (!isValid) {
                logger.error(['Invalid cron schedule:', newSchedule]);
                return false;
            }
            this.currentSchedule = newSchedule;

            // Create new cron job
            this.cronJob = cron.schedule(this.currentSchedule, () => {
                try {
                    logger.info('Running scheduled message...');
                    this.onScheduleTrigger();
                } catch (error) {
                    logger.error(['Error running scheduled message:', error.message]);
                }
            });

            return true;
        } catch (error) {
            logger.error(['Run time error occurred durin the update of cron schedule:', error.message]);
            return false;
        }
    }

    getCurrentSchedule() {
        return this.currentSchedule;
    }

    setScheduleCallback(callback) {
        this.onScheduleTrigger = callback;
    }
}

module.exports = CronHandler; 