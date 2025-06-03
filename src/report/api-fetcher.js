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
            logger.error('Error fetching client info:', error.message);
            if (error.response) {
                logger.error('Response status:', error.response.status);
                logger.error('Response data:', error.response.data);
            }
            throw error;
        }
    }
}

module.exports = new MonobankApiFetcher(); 