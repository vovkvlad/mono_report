const axios = require('axios');

/**
 * API Fetcher for Monobank API
 * Handles authentication and requests to the Monobank API
 */
class MonobankApiFetcher {
    constructor() {
        this.baseUrl = 'https://api.monobank.ua';
        this.apiKey = process.env.MONOBANK_API_KEY;
        
        if (!this.apiKey) {
            console.warn('MONOBANK_API_KEY is not set in environment variables');
        }
    }

    /**
     * Get client information from Monobank API
     * @returns {Promise<Object>} Client information
     */
    async getClientInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/personal/client-info`, {
                headers: {
                    'X-Token': this.apiKey
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('Error fetching client info:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw error;
        }
    }
}

module.exports = new MonobankApiFetcher(); 