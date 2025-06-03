const apiFetcher = require('./api-fetcher');
const logger = require('../logger');

/**
 * Calculate residual balance for a specific IBAN
 * @returns {Promise<number>} Residual balance in hryvnia
 */
async function calculateResidual() {
    try {
        const clientInfo = await apiFetcher.getClientInfo();
        const targetIban = process.env.IBAN_TO_FETCH;

        if (!targetIban) {
            throw new Error('IBAN_TO_FETCH environment variable is not set');
        }

        const targetAccount = clientInfo.accounts.find(account => account.iban === targetIban);

        if (!targetAccount) {
            throw new Error(`No account found with IBAN: ${targetIban}`);
        }

        const residual = targetAccount.balance - targetAccount.creditLimit;
        return Number((residual / 100).toFixed(2)); // Convert from cents to hryvnia and return as number
    } catch (error) {
        logger.error('Error calculating residual:', error.message);
        throw error;
    }
}

/**
 * Generate a report with daily and weekly spending limits based on residual balance
 * @returns {Promise<Object>} Report with residual balance and spending limits
 */
async function generateResidualReport() {
    try {
        const residual = await calculateResidual();
        
        // Get current date and last day of the month
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Calculate days remaining in the month
        const daysRemaining = lastDayOfMonth.getDate() - now.getDate() + 1;
        
        // Calculate weeks remaining (rounded to 1 decimal place)
        const weeksRemaining = Number((daysRemaining / 7).toFixed(1));
        
        // Calculate daily and weekly spending limits
        const dailyLimit = Number((residual / daysRemaining).toFixed(2));
        const weeklyLimit = Number((residual / weeksRemaining).toFixed(2));
        
        return {
            residual,
            daysRemaining,
            weeksRemaining,
            dailyLimit,
            weeklyLimit
        };
    } catch (error) {
        logger.error('Error generating residual report:', error.message);
        throw error;
    }
}

module.exports = {
    calculateResidual,
    generateResidualReport
}; 