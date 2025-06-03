require('dotenv').config();
const Bot = require('./bot/bot');
const logger = require('./logger');

async function startApp() {
    try {
        // Initialize the bot
        const bot = new Bot();
        await bot.initialize();
        
        logger.info('Bot started successfully!');
        
        // Handle process termination
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT signal. Shutting down...');
            // Add any cleanup logic here if needed
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM signal. Shutting down...');
            // Add any cleanup logic here if needed
            process.exit(0);
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error(['Uncaught Exception:', error]);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error(['Unhandled Rejection at:', promise, 'reason:', reason]);
        });
        
    } catch (error) {
        logger.error(['Failed to start the application:', error]);
        process.exit(1);
    }
}

// Start the application
startApp(); 