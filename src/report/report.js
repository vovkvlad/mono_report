const apiFetcher = require('./api-fetcher');
const logger = require('../logger');

// Global variable to store account ID
let ACCOUNT_ID = null;
let CREDIT_LIMIT = null;

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

        // Set global ACCOUNT_ID and CREDIT_LIMIT if not already set
        if (!ACCOUNT_ID) {
            ACCOUNT_ID = targetAccount.id;
            CREDIT_LIMIT = targetAccount.creditLimit;
            logger.info(`ACCOUNT_ID set to: ${ACCOUNT_ID}, CREDIT_LIMIT set to: ${CREDIT_LIMIT}`);
        }

        const residual = targetAccount.balance - targetAccount.creditLimit;
        return Number((residual / 100).toFixed(2)); // Convert from cents to hryvnia and return as number
    } catch (error) {
        logger.error(['Error calculating residual:', error.message]);
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
        logger.error(['Error generating residual report:', error.message]);
        throw error;
    }
}

/**
 * Calculate unix timestamp for a week ago from today
 * @returns {number} Unix timestamp (seconds)
 */
function calculateUnixTimeStamp() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return Math.floor(weekAgo.getTime() / 1000);
}

// Simple in-memory cache for statement API
let statementCache = {
    data: null,
    timestamp: 0
};
const STATEMENT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Fetch statement for the account for the last week
 * @returns {Promise<Array>} Array of statement transactions
 */
async function fetchStatement() {
    const now = Date.now();
    if (statementCache.data && (now - statementCache.timestamp < STATEMENT_CACHE_TTL_MS)) {
        logger.info('Returning cached statement data');
        return statementCache.data;
    }
    const fromTimestamp = calculateUnixTimeStamp();
    let accountId = ACCOUNT_ID;
    const targetIban = process.env.IBAN_TO_FETCH;

    if (!accountId) {
        // If ACCOUNT_ID is not set, fetch client info and set it
        const clientInfo = await apiFetcher.getClientInfo();
        const targetAccount = clientInfo.accounts.find(account => account.iban === targetIban);
        if (!targetAccount) {
            throw new Error(`No account found with IBAN: ${targetIban}`);
        }
        ACCOUNT_ID = targetAccount.id;
        CREDIT_LIMIT = targetAccount.creditLimit;
        logger.info(`ACCOUNT_ID set to: ${ACCOUNT_ID}, CREDIT_LIMIT set to: ${CREDIT_LIMIT}`);
        accountId = ACCOUNT_ID;
    }
    const statement = await apiFetcher.getStatement(accountId, fromTimestamp);
    // Format each transaction in the statement
    const formatted = Array.isArray(statement)
        ? statement.map(tx => formatStatementResponse(tx, CREDIT_LIMIT))
        : [];
    // Cache the result
    statementCache = {
        data: formatted,
        timestamp: now
    };
    return formatted;
}

/**
 * Generate a chronological report of transactions for the last week
 * @returns {Promise<Array>} Array of transactions sorted by time ascending
 */
async function generateChronologicalReport() {
    const statement = await fetchStatement();
    // Sort by time ascending (oldest first)
    return statement;
}

/**
 * Generate a report of transactions sorted by amount (max to min, spending only)
 * @returns {Promise<Array>} Array of transactions sorted by amount descending (spending only)
 */
async function generateMaxToMinReport() {
    const statement = await fetchStatement();
    // Spending transactions have negative amount
    const spending = statement.filter(tx => tx.amount < 0);
    // Sort by absolute value of amount descending (largest spending first)
    return spending.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

/**
 * Format a statement object with additional properties
 * @param {Object} statement - The statement object from Monobank
 * @param {number} creditLimit - The credit limit for the account
 * @returns {Object} Formatted statement with localTime, parsedAmount, parsedBalance, and currency
 */
function formatStatementResponse(statement, creditLimit) {
    const currencyMap = {
        980: 'UAH',
        840: 'USD',
        978: 'EUR',
        // Add more as needed
    };
    const timezone = process.env.TIMEZONE || 'Europe/Kiev';
    const localTime = new Date(statement.time * 1000).toLocaleString('uk-UA', { timeZone: timezone });
    
    // Calculate real balance by subtracting credit limit (your own money only)
    const realBalance = statement.balance - creditLimit;
    
    return {
        ...statement,
        localTime,
        parsedAmount: (statement.amount / 100).toFixed(2),
        parsedBalance: Number((realBalance / 100).toFixed(2)),
        currency: currencyMap[statement.currencyCode] || statement.currencyCode
    };
}

module.exports = {
    calculateResidual,
    generateResidualReport,
    generateChronologicalReport,
    generateMaxToMinReport
}; 