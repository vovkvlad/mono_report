const axios = require('axios');
const logger = require('../logger');

/**
 * API Fetcher for Monobank API
 * Handles authentication and requests to the Monobank API
 */
class MonobankApiFetcher {
    constructor() {
        this.baseUrl = 'https://api.monobank.ua';
        this.apiKey = process.env.MONOBANK_API_KEY;

        if (!this.apiKey) {
            logger.warn('MONOBANK_API_KEY is not set in environment variables');
        }
    }

    /**
     * Get client information from Monobank API
     * @returns {Promise<Object>} Client information
     */
    async getClientInfo() {
        try {
            logger.info('Fetching client info...');
            const response = await axios.get(`${this.baseUrl}/personal/client-info`, {
                headers: {
                    'X-Token': this.apiKey
                }
            });

            logger.info('Client info fetched successfully');
            return response.data;
        } catch (error) {
            logger.error(['Error fetching client info:', error.message]);
            if (error.response) {
                logger.error(['Response status:', error.response.status]);
                logger.error(['Response data:', error.response.data]);
            }
            throw error;
        }
    }

    /**
     * Get account statement from Monobank API
     * @param {string} accountId - Account ID
     * @param {number} from - Unix timestamp (seconds) for the start of the period
     * @param {number} [to] - Optional Unix timestamp (seconds) for the end of the period
     * @returns {Promise<Object>} Account statement
     */
    async getStatement(accountId, from, to) {
        try {
            logger.info(`Fetching statement for account: ${accountId}, from: ${from}, to: ${to}`);
            let url = `${this.baseUrl}/personal/statement/${accountId}/${from}`;
            if (to !== undefined && to !== null) {
                url += `/${to}`;
            }
            const response = await axios.get(url, {
                headers: {
                    'X-Token': this.apiKey
                }
            });
            logger.info('Statement fetched successfully');
            return response.data;
        } catch (error) {
            logger.error(['Error fetching statement:', error.message]);
            if (error.response) {
                logger.error(['Response status:', error.response.status]);
                logger.error(['Response data:', error.response.data]);
            }
            throw error;
        }
    }
}

module.exports = new MonobankApiFetcher(); 