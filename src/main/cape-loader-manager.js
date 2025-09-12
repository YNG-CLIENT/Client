/**
 * Cape Loader Manager for YNG Client
 * Handles in-game cape loading and texture management
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const config = require('./config');

class CapeLoaderManager {
    constructor() {
        this.capeCache = new Map();
        this.gameDirectory = null;
        this.profilesCache = new Map();
    }

    /**
     * Set the Minecraft game directory
     * @param {string} gameDir - Game directory path
     */
    setGameDirectory(gameDir) {
        this.gameDirectory = gameDir;
    }

    /**
     * Load and apply cape texture for user
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeId - Cape ID to load
     * @returns {Promise<boolean>} Success status
     */
    async loadCapeForUser(mcUuid, capeId) {
        try {
            if (!this.gameDirectory) {
                console.warn('Game directory not set, cannot load cape');
                return false;
            }

            // Download cape texture from API
            const textureUrl = `${config.API_BASE_URL}/api/capes/texture/${capeId}`;
            const capeData = await this.downloadCapeTexture(textureUrl);
            
            if (!capeData) {
                console.warn('Failed to download cape texture:', capeId);
                return false;
            }

            // Save cape to game directory
            const capeFilePath = await this.saveCapeTexture(mcUuid, capeId, capeData);
            
            if (!capeFilePath) {
                console.warn('Failed to save cape texture');
                return false;
            }

            // Update user profile with cape information
            await this.updateUserProfile(mcUuid, capeId, capeFilePath);
            
            console.log('Successfully loaded cape for user:', mcUuid, capeId);
            return true;
        } catch (error) {
            console.error('Failed to load cape for user:', error);
            return false;
        }
    }

    /**
     * Download cape texture from URL
     * @param {string} url - Texture URL
     * @returns {Promise<Buffer|null>} Texture data
     */
    async downloadCapeTexture(url) {
        return new Promise((resolve) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    console.error('Failed to download cape texture:', response.statusCode);
                    resolve(null);
                    return;
                }

                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on('error', (error) => {
                console.error('Error downloading cape texture:', error);
                resolve(null);
            });
        });
    }

    /**
     * Save cape texture to game directory
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeId - Cape ID
     * @param {Buffer} capeData - Cape texture data
     * @returns {Promise<string|null>} File path
     */
    async saveCapeTexture(mcUuid, capeId, capeData) {
        try {
            // Create capes directory in game folder
            const capesDir = path.join(this.gameDirectory, 'yng-capes');
            await fs.mkdir(capesDir, { recursive: true });

            // Save cape with user-specific name
            const capeFileName = `${mcUuid}_${capeId}.png`;
            const capeFilePath = path.join(capesDir, capeFileName);
            
            await fs.writeFile(capeFilePath, capeData);
            
            return capeFilePath;
        } catch (error) {
            console.error('Failed to save cape texture:', error);
            return null;
        }
    }

    /**
     * Update user profile with cape information
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeId - Cape ID
     * @param {string} capeFilePath - Local cape file path
     */
    async updateUserProfile(mcUuid, capeId, capeFilePath) {
        try {
            // Create/update YNG profile file for the user
            const profilesDir = path.join(this.gameDirectory, 'yng-profiles');
            await fs.mkdir(profilesDir, { recursive: true });

            const profileFile = path.join(profilesDir, `${mcUuid}.json`);
            
            let profile = {};
            try {
                const profileData = await fs.readFile(profileFile, 'utf8');
                profile = JSON.parse(profileData);
            } catch (error) {
                // Profile doesn't exist, create new one
                profile = {
                    uuid: mcUuid,
                    capes: {},
                    selectedCape: null,
                    lastUpdated: new Date().toISOString()
                };
            }

            // Update cape information
            profile.capes[capeId] = {
                id: capeId,
                filePath: capeFilePath,
                downloaded: new Date().toISOString()
            };
            profile.selectedCape = capeId;
            profile.lastUpdated = new Date().toISOString();

            // Save updated profile
            await fs.writeFile(profileFile, JSON.stringify(profile, null, 2));
            
            // Cache the profile
            this.profilesCache.set(mcUuid, profile);
            
            console.log('Updated user profile with cape:', mcUuid, capeId);
        } catch (error) {
            console.error('Failed to update user profile:', error);
        }
    }

    /**
     * Remove cape for user
     * @param {string} mcUuid - Minecraft UUID
     */
    async removeCapeForUser(mcUuid) {
        try {
            const profile = await this.getUserProfile(mcUuid);
            if (profile) {
                profile.selectedCape = null;
                profile.lastUpdated = new Date().toISOString();
                
                const profileFile = path.join(this.gameDirectory, 'yng-profiles', `${mcUuid}.json`);
                await fs.writeFile(profileFile, JSON.stringify(profile, null, 2));
                
                console.log('Removed cape for user:', mcUuid);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to remove cape for user:', error);
            return false;
        }
    }

    /**
     * Get user profile from cache or file
     * @param {string} mcUuid - Minecraft UUID
     * @returns {Promise<Object|null>} User profile
     */
    async getUserProfile(mcUuid) {
        try {
            // Check cache first
            if (this.profilesCache.has(mcUuid)) {
                return this.profilesCache.get(mcUuid);
            }

            // Try to load from file
            if (this.gameDirectory) {
                const profileFile = path.join(this.gameDirectory, 'yng-profiles', `${mcUuid}.json`);
                try {
                    const profileData = await fs.readFile(profileFile, 'utf8');
                    const profile = JSON.parse(profileData);
                    this.profilesCache.set(mcUuid, profile);
                    return profile;
                } catch (error) {
                    // Profile doesn't exist
                    return null;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return null;
        }
    }

    /**
     * Get selected cape for user
     * @param {string} mcUuid - Minecraft UUID
     * @returns {Promise<string|null>} Selected cape ID
     */
    async getSelectedCape(mcUuid) {
        try {
            const profile = await this.getUserProfile(mcUuid);
            return profile?.selectedCape || null;
        } catch (error) {
            console.error('Failed to get selected cape:', error);
            return null;
        }
    }

    /**
     * Check if cape is downloaded for user
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeId - Cape ID
     * @returns {Promise<boolean>} Downloaded status
     */
    async isCapeDownloaded(mcUuid, capeId) {
        try {
            const profile = await this.getUserProfile(mcUuid);
            if (profile && profile.capes && profile.capes[capeId]) {
                const capeInfo = profile.capes[capeId];
                // Check if file still exists
                try {
                    await fs.access(capeInfo.filePath);
                    return true;
                } catch (error) {
                    // File doesn't exist, remove from profile
                    delete profile.capes[capeId];
                    if (profile.selectedCape === capeId) {
                        profile.selectedCape = null;
                    }
                    await this.updateUserProfile(mcUuid, null, null);
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Failed to check cape download status:', error);
            return false;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.capeCache.clear();
        this.profilesCache.clear();
    }

    /**
     * Get cape directory path
     * @returns {string|null} Cape directory path
     */
    getCapesDirectory() {
        if (!this.gameDirectory) {
            return null;
        }
        return path.join(this.gameDirectory, 'yng-capes');
    }

    /**
     * Clean up old cape files
     * @param {number} maxAge - Maximum age in days
     */
    async cleanupOldCapes(maxAge = 30) {
        try {
            const capesDir = this.getCapesDirectory();
            if (!capesDir) {
                return;
            }

            const files = await fs.readdir(capesDir);
            const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(capesDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAgeMs) {
                    await fs.unlink(filePath);
                    console.log('Cleaned up old cape file:', file);
                }
            }
        } catch (error) {
            console.error('Failed to clean up old capes:', error);
        }
    }
}

module.exports = CapeLoaderManager;