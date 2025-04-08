require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

// Create a bot instance
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Store cron schedule and active chats in memory
let currentCronSchedule = process.env.CRON_SCHEDULE;
let cronJob = null;
const activeChats = new Set();
let botId = null;

// Initialize bot info
bot.getMe().then((botInfo) => {
    botId = botInfo.id;
    console.log(`Bot initialized with ID: ${botId}`);
}).catch((error) => {
    console.error('Error getting bot info:', error);
});

// Function to send message to all active chats
async function sendMessage() {
    for (const chatId of activeChats) {
        try {
            await bot.sendMessage(chatId, process.env.MESSAGE);
            console.log(`Message sent successfully to chat ${chatId}`);
        } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error.message);
            // If the bot was removed from the chat, remove it from active chats
            if (error.response && error.response.statusCode === 403) {
                activeChats.delete(chatId);
                console.log(`Removed chat ${chatId} from active chats`);
            }
        }
    }
}

// Function to update cron schedule
function updateCronSchedule(newSchedule) {
    // Cancel existing cron job if it exists
    if (cronJob) {
        cronJob.stop();
    }

    try {
        // Validate the cron schedule
        cron.validate(newSchedule);
        currentCronSchedule = newSchedule;
        
        // Create new cron job
        cronJob = cron.schedule(currentCronSchedule, () => {
            console.log('Running scheduled message...');
            sendMessage();
        });

        return true;
    } catch (error) {
        console.error('Invalid cron schedule:', error.message);
        return false;
    }
}

// Initialize the cron job
updateCronSchedule(currentCronSchedule);

// Store user states for conversation flow
const userStates = new Map();

// Handle /cron command
bot.onText(/\/cron/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Check if user is admin
    try {
        const chatMember = await bot.getChatMember(chatId, msg.from.id);
        if (chatMember.status !== 'administrator' && chatMember.status !== 'creator') {
            await bot.sendMessage(chatId, 'Sorry, only administrators can configure the cron schedule.');
            return;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        return;
    }

    userStates.set(chatId, 'waiting_for_cron');
    await bot.sendMessage(
        chatId,
        'Please send me the new cron schedule.\n\nExample: `0 0 */3 * *` (runs every 3 days at midnight)\n\nYou can use [crontab.guru](https://crontab.guru/) to help create your schedule.',
        { parse_mode: 'Markdown' }
    );
});

// Handle messages when waiting for cron schedule
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates.get(chatId);

    if (state === 'waiting_for_cron') {
        userStates.delete(chatId); // Clear the state
        
        const newSchedule = msg.text.trim();
        const isValid = updateCronSchedule(newSchedule);

        if (isValid) {
            await bot.sendMessage(
                chatId,
                `✅ Cron schedule updated successfully!\nNew schedule: \`${newSchedule}\``,
                { parse_mode: 'Markdown' }
            );
        } else {
            await bot.sendMessage(
                chatId,
                '❌ Invalid cron schedule. Please try again with a valid cron expression.',
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// Handle bot being added to a group
bot.on('new_chat_members', async (msg) => {
    if (botId && msg.new_chat_members.some(member => member.id === botId)) {
        const chatId = msg.chat.id;
        activeChats.add(chatId);
        await bot.sendMessage(
            chatId,
            `👋 Hello! I'm your periodic message bot.\n\n` +
            `Current schedule: \`${currentCronSchedule}\`\n` +
            `Use /cron to change the schedule.\n\n` +
            `You can use [crontab.guru](https://crontab.guru/) to help create your schedule.`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Handle bot being removed from a group
bot.on('left_chat_member', async (msg) => {
    if (botId && msg.left_chat_member.id === botId) {
        const chatId = msg.chat.id;
        activeChats.delete(chatId);
        console.log(`Bot removed from chat ${chatId}`);
    }
});

console.log('Bot started successfully!'); 