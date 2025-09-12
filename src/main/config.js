/**
 * YNG Client Configuration
 * API and application settings
 */

class Config {
    constructor() {
        // API Configuration
        this.API_BASE_URL = process.env.YNG_API_URL || 'http://localhost:3001';
        this.API_ENDPOINTS = {
            AUTH: '/api/auth',
            CAPES: '/api/capes',
            USERS: '/api/users'
        };

        // Client Configuration
        this.APP_VERSION = '1.0.0';
        this.UPDATE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
        
        // Cache Configuration
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.MAX_CACHE_SIZE = 100; // Maximum cached items
        
        // Development flags
        this.DEVELOPMENT_MODE = process.env.NODE_ENV === 'development';
        this.DEBUG_API = process.env.DEBUG_API === 'true';
    }

    /**
     * Get full API URL for a specific endpoint
     * @param {string} endpoint - The endpoint path
     * @returns {string} Full URL
     */
    getApiUrl(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    }

    /**
     * Get authentication endpoint URL
     * @returns {string} Auth endpoint URL
     */
    getAuthUrl() {
        return this.getApiUrl(this.API_ENDPOINTS.AUTH);
    }

    /**
     * Get capes endpoint URL
     * @returns {string} Capes endpoint URL
     */
    getCapesUrl() {
        return this.getApiUrl(this.API_ENDPOINTS.CAPES);
    }

    /**
     * Get users endpoint URL
     * @returns {string} Users endpoint URL
     */
    getUsersUrl() {
        return this.getApiUrl(this.API_ENDPOINTS.USERS);
    }

    /**
     * Check if running in development mode
     * @returns {boolean} Development mode status
     */
    isDevelopment() {
        return this.DEVELOPMENT_MODE;
    }

    /**
     * Check if API debugging is enabled
     * @returns {boolean} Debug status
     */
    isDebugMode() {
        return this.DEBUG_API;
    }
}

module.exports = new Config();