/**
 * API Manager for YNG Client
 * Handles all communication with the YNG API backend
 */

const axios = require('axios');
const config = require('./config');

class ApiManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.cache = new Map();
        
        // Create axios instance with default config
        this.api = axios.create({
            baseURL: config.API_BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Setup interceptors for debugging
        if (config.isDebugMode()) {
            this.setupDebugInterceptors();
        }
    }

    /**
     * Setup debug interceptors for API requests
     */
    setupDebugInterceptors() {
        this.api.interceptors.request.use(request => {
            console.log('[API] Request:', request.method?.toUpperCase(), request.url);
            return request;
        });

        this.api.interceptors.response.use(
            response => {
                console.log('[API] Response:', response.status, response.config.url);
                return response;
            },
            error => {
                console.error('[API] Error:', error.response?.status, error.config?.url, error.message);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Authenticate user with MC UUID
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} mcUsername - Minecraft username
     * @returns {Promise<Object>} User data
     */
    async authenticateUser(mcUuid, mcUsername) {
        try {
            console.log('[API] Authenticating user:', mcUuid, mcUsername);
            const response = await this.api.post('/api/auth/signin', {
                minecraftUuid: mcUuid,
                minecraftUsername: mcUsername
            });

            if (response.data.success) {
                this.isAuthenticated = true;
                this.currentUser = response.data.user;
                console.log('[API] User authenticated:', mcUsername);
                return response.data;
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            console.error('[API] Authentication error:', error.message);
            if (error.response) {
                console.error('[API] Response data:', error.response.data);
                console.error('[API] Response status:', error.response.status);
            }
            throw error;
        }
    }

    /**
     * Get user's capes from API
     * @param {string} mcUuid - Minecraft UUID
     * @returns {Promise<Array>} Array of cape objects
     */
    async getUserCapes(mcUuid) {
        try {
            const cacheKey = `user_capes_${mcUuid}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < config.CACHE_DURATION) {
                    return cached.data;
                }
            }

            const response = await this.api.get(`/api/capes/user/${mcUuid}`);
            
            if (response.data.success) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: response.data.capes,
                    timestamp: Date.now()
                });
                
                return response.data.capes;
            } else {
                throw new Error('Failed to fetch user capes');
            }
        } catch (error) {
            console.error('[API] Error fetching user capes:', error.message);
            return []; // Return empty array on error
        }
    }

    /**
     * Get all available capes
     * @returns {Promise<Array>} Array of all cape objects
     */
    async getAllCapes() {
        try {
            const cacheKey = 'all_capes';
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < config.CACHE_DURATION) {
                    return cached.data;
                }
            }

            const response = await this.api.get('/api/capes');
            
            if (response.data.success) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: response.data.capes,
                    timestamp: Date.now()
                });
                
                return response.data.capes;
            } else {
                throw new Error('Failed to fetch capes');
            }
        } catch (error) {
            console.error('[API] Error fetching capes:', error.message);
            return []; // Return empty array on error
        }
    }

    /**
     * Select a cape for the user
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeId - Cape ID to select
     * @returns {Promise<Object>} Selection result
     */
    async selectCape(mcUuid, capeId) {
        try {
            const response = await this.api.post('/api/capes/select', {
                minecraftUuid: mcUuid,
                capeId
            });

            if (response.data.success) {
                // Clear user capes cache to force refresh
                this.cache.delete(`user_capes_${mcUuid}`);
                console.log('[API] Cape selected:', capeId);
                return response.data;
            } else {
                throw new Error('Failed to select cape');
            }
        } catch (error) {
            console.error('[API] Error selecting cape:', error.message);
            throw error;
        }
    }

    /**
     * Get cape texture URL
     * @param {string} capeId - Cape ID
     * @returns {string} Texture URL
     */
    getCapeTextureUrl(capeId) {
        return `${config.API_BASE_URL}/api/capes/texture/${capeId}`;
    }

    /**
     * Update user stats
     * @param {string} mcUuid - Minecraft UUID
     * @param {Object} stats - Stats to update
     * @returns {Promise<Object>} Update result
     */
    async updateUserStats(mcUuid, stats) {
        try {
            const response = await this.api.post('/api/auth/stats', {
                minecraftUuid: mcUuid,
                stats
            });

            if (response.data.success) {
                console.log('[API] Stats updated for user:', mcUuid);
                return response.data;
            } else {
                throw new Error('Failed to update stats');
            }
        } catch (error) {
            console.error('[API] Error updating stats:', error.message);
            throw error;
        }
    }

    /**
     * Check if user has unlocked a specific cape
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeId - Cape ID to check
     * @returns {Promise<boolean>} Unlock status
     */
    async checkCapeUnlock(mcUuid, capeId) {
        try {
            const response = await this.api.get(`/api/auth/unlock/${mcUuid}/${capeId}`);
            if (response.data.success) {
                return { success: true, unlocked: response.data.unlocked };
            } else {
                return { success: false, unlocked: false };
            }
        } catch (error) {
            console.error('[API] Error checking cape unlock:', error.message);
            return { success: false, unlocked: false };
        }
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('[API] Cache cleared');
    }

    /**
     * Get current authentication status
     * @returns {boolean} Authentication status
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Get current user data
     * @returns {Object|null} Current user object
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Logout current user
     */
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.clearCache();
        console.log('[API] User logged out');
    }
}

module.exports = new ApiManager();