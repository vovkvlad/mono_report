require('dotenv').config();
const Bot = require('./src/bot/bot');

async function startApp() {
    try {
        // Initialize the bot
        const bot = new Bot();
        await bot.initialize();
        
        console.log('Bot started successfully!');
        
        // Handle process termination
        process.on('SIGINT', async () => {
            console.log('Shutting down...');
            // Add any cleanup logic here if needed
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('Shutting down...');
            // Add any cleanup logic here if needed
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Failed to start the application:', error.message);
        process.exit(1);
    }
}

// Start the application
startApp(); 