/**
 * Mojang API Integration for YNG Client
 * Handles fetching user profile data, skins, and capes from Mojang
 */

const axios = require('axios');

class MojangAPIManager {
    constructor() {
        this.baseURL = 'https://api.mojang.com';
        this.sessionURL = 'https://sessionserver.mojang.com';
        this.servicesURL = 'https://api.minecraftservices.com';
        this.profileCache = new Map();
        this.authToken = null;
    }

    /**
     * Set authentication token for Microsoft/Mojang API calls
     * @param {string} token - Bearer token from Microsoft auth
     */
    setAuthToken(token) {
        this.authToken = token;
        console.log('[Mojang API] Authentication token set');
    }

    /**
     * Get authenticated headers for API requests
     * @returns {Object} Headers object
     */
    getAuthHeaders() {
        const headers = {
            'User-Agent': 'YNG-Client/1.0.0',
            'Content-Type': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    /**
     * Get user profile with textures (skin and cape data)
     * @param {string} uuid - Minecraft UUID (with or without dashes)
     * @returns {Promise<Object|null>} Profile data with textures
     */
    async getUserProfile(uuid) {
        try {
            // Remove dashes from UUID for API call
            const cleanUuid = uuid.replace(/-/g, '');
            
            // Check cache first
            const cacheKey = `profile_${cleanUuid}`;
            if (this.profileCache.has(cacheKey)) {
                const cached = this.profileCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                    console.log('[Mojang API] Using cached profile data');
                    return cached.data;
                }
            }

            console.log(`[Mojang API] Fetching profile for UUID: ${cleanUuid}`);

            // Fetch profile with textures
            const response = await axios.get(
                `${this.sessionURL}/session/minecraft/profile/${cleanUuid}`,
                {
                    timeout: 10000,
                    headers: this.getAuthHeaders()
                }
            );

            if (response.data) {
                console.log('[Mojang API] Profile fetched successfully');
                
                // Cache the result
                this.profileCache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now()
                });
                
                return response.data;
            }
            
            return null;
        } catch (error) {
            console.error('[Mojang API] Failed to fetch profile:', error.response?.status || error.message);
            return null;
        }
    }

    /**
     * Extract cape data from Mojang profile
     * @param {Object} profile - Mojang profile data
     * @returns {Array} Array of cape objects
     */
    extractCapes(profile) {
        const capes = [];
        
        if (!profile || !profile.properties) {
            console.log('[Mojang API] No profile properties found');
            return capes;
        }

        try {
            // Find textures property
            const textureProperty = profile.properties.find(prop => prop.name === 'textures');
            if (!textureProperty) {
                console.log('[Mojang API] No textures property found');
                return capes;
            }

            // Decode base64 texture data
            const textureData = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString());
            
            if (textureData.textures && textureData.textures.CAPE) {
                const capeTexture = textureData.textures.CAPE;
                console.log('[Mojang API] Cape texture found:', capeTexture.url);
                
                // Identify cape type from URL
                const capeInfo = this.identifyCapeFromUrl(capeTexture.url);
                
                capes.push({
                    id: capeInfo.id,
                    name: capeInfo.name,
                    description: capeInfo.description,
                    textureUrl: capeTexture.url, // Use textureUrl for consistency
                    texture: capeTexture.url, // Keep backward compatibility
                    type: 'mojang',
                    category: 'official',
                    rarity: capeInfo.rarity || 'legendary',
                    unlocked: true,
                    owned: true,
                    source: 'mojang_profile'
                });
            } else {
                console.log('[Mojang API] No cape texture found in profile');
            }
        } catch (error) {
            console.error('[Mojang API] Failed to extract cape data:', error);
        }

        return capes;
    }

    /**
     * Get all capes owned by user using new Mojang API
     * @param {string} uuid - Minecraft UUID
     * @returns {Promise<Array>} Array of cape objects
     */
    async getUserCapes(uuid) {
        try {
            // Clean UUID
            const cleanUuid = uuid.replace(/-/g, '');
            
            console.log(`[Mojang API] Fetching user capes for: ${cleanUuid}`);

            // Check cache first
            const cacheKey = `capes_${cleanUuid}`;
            if (this.profileCache.has(cacheKey)) {
                const cached = this.profileCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                    console.log('[Mojang API] Using cached cape data');
                    return cached.data;
                }
            }

            // Try the new capes API endpoint with authentication
            try {
                const response = await axios.get(
                    `${this.servicesURL}/minecraft/profile/${cleanUuid}/capes`,
                    {
                        timeout: 10000,
                        headers: this.getAuthHeaders()
                    }
                );

                if (response.data && response.data.capes) {
                    console.log(`[Mojang API] Found ${response.data.capes.length} capes via services API`);
                    
                    const processedCapes = response.data.capes.map(cape => ({
                        id: this.generateCapeId(cape.alias || cape.id),
                        name: cape.alias || 'Unknown Cape',
                        description: `Official Mojang cape: ${cape.alias || 'Unknown'}`,
                        textureUrl: cape.url, // Use textureUrl for consistency
                        texture: cape.url, // Keep backward compatibility
                        type: 'mojang',
                        category: 'official',
                        rarity: this.getCapeRarity(cape.alias),
                        unlocked: true,
                        owned: true,
                        active: cape.state === 'ACTIVE',
                        mojangId: cape.id,
                        source: 'mojang_services_api'
                    }));

                    // Cache the result
                    this.profileCache.set(cacheKey, {
                        data: processedCapes,
                        timestamp: Date.now()
                    });

                    return processedCapes;
                }
            } catch (apiError) {
                console.warn('[Mojang API] Services API failed (this is expected without proper auth), trying fallback:', apiError.response?.status || apiError.message);
            }
            
            // Fallback to profile-based cape detection
            console.log('[Mojang API] Falling back to profile-based cape detection');
            const profile = await this.getUserProfile(uuid);
            const profileCapes = this.extractCapes(profile);
            
            // Cache the fallback result
            this.profileCache.set(cacheKey, {
                data: profileCapes,
                timestamp: Date.now()
            });
            
            return profileCapes;
            
        } catch (error) {
            console.error('[Mojang API] Failed to fetch user capes:', error.response?.status || error.message);
            return [];
        }
    }

    /**
     * Generate consistent cape ID from alias
     * @param {string} alias - Cape alias
     * @returns {string} Cape ID
     */
    generateCapeId(alias) {
        if (!alias) return 'unknown_cape';
        return alias.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    /**
     * Get cape rarity based on type
     * @param {string} alias - Cape alias
     * @returns {string} Rarity level
     */
    getCapeRarity(alias) {
        const rarityMap = {
            'vanilla': 'legendary',
            'minecon': 'legendary',
            'migrator': 'epic',
            'translator': 'epic',
            'mojang': 'legendary',
            'cobalt': 'rare',
            'scrolls': 'rare',
            'pancake': 'rare',
            'birthday': 'epic',
            'cherry': 'rare',
            'millionth': 'legendary'
        };

        if (!alias) return 'legendary';
        
        const lowerAlias = alias.toLowerCase();
        for (const [key, rarity] of Object.entries(rarityMap)) {
            if (lowerAlias.includes(key)) {
                return rarity;
            }
        }
        
        return 'rare'; // Default for unknown capes
    }

    /**
     * Identify cape from texture URL (legacy method)
     * @param {string} url - Cape texture URL
     * @returns {Object} Cape information
     */
    identifyCapeFromUrl(url) {
        const knownCapes = {
            // Common texture hashes for known capes
            'f9a76537647989f9a0b6d001e320dac591c359e9e61a31f4ce11c88f207f0ad4': {
                id: 'vanilla',
                name: 'Vanilla Cape',
                description: 'Classic vanilla Minecraft cape',
                rarity: 'legendary'
            },
            'afd553b39358a24edfe3b8a9a939fa5fa4faa4d9a9c3d6af8eafb377fa05c2bb': {
                id: 'cherry_blossom',
                name: 'Cherry Blossom',
                description: 'Cherry Blossom cape',
                rarity: 'rare'
            },
            'dbc21e222528e30dc88445314f7be6ff12d3aeebc3c192054fba7e3b3f8c77b1': {
                id: 'menace',
                name: 'Menace',
                description: 'Menace cape',
                rarity: 'epic'
            },
            'cb40a92e32b57fd732a00fc325e7afb00a7ca74936ad50d8e860152e482cfbde': {
                id: 'purple_heart',
                name: 'Purple Heart',
                description: 'Purple Heart cape',
                rarity: 'rare'
            },
            // Minecon capes
            '2340c0e03dd24a11b15a8b33c2a7e9e32abb2051b2481d0ba7defd635ca7a933': {
                id: 'minecon_2011',
                name: 'Minecon 2011',
                description: 'Minecon 2011 attendee cape',
                rarity: 'legendary'
            },
            'a2e8d97ec79100e90a75d369d1b3ba81273c4f82bc1b737e934eed4a854be1b6': {
                id: 'minecon_2012',
                name: 'Minecon 2012', 
                description: 'Minecon 2012 attendee cape',
                rarity: 'legendary'
            },
            'bc7f669c2681c81bc7f9971043e12a38edc45c4ecdd2e8967e4e6c7c7f6f3d4': {
                id: 'minecon_2013',
                name: 'Minecon 2013',
                description: 'Minecon 2013 attendee cape',
                rarity: 'legendary'
            },
            'fb6bb0e2faee4da1b4615c66b95a84b60e2dfd3c73bd6e4f2f9c91c50b8ea4c': {
                id: 'migrator',
                name: 'Migrator',
                description: 'Account migration cape',
                rarity: 'epic'
            }
        };

        // Extract texture hash from URL
        const hashMatch = url.match(/texture\/([a-f0-9]+)/);
        if (hashMatch && knownCapes[hashMatch[1]]) {
            return knownCapes[hashMatch[1]];
        }

        // Try to identify from URL path
        const urlLower = url.toLowerCase();
        if (urlLower.includes('vanilla')) {
            return { id: 'vanilla', name: 'Vanilla Cape', description: 'Classic vanilla Minecraft cape', rarity: 'legendary' };
        }
        if (urlLower.includes('minecon')) {
            return { id: 'minecon_cape', name: 'Minecon Cape', description: 'Minecon attendee cape', rarity: 'legendary' };
        }
        if (urlLower.includes('migrator')) {
            return { id: 'migrator', name: 'Migrator Cape', description: 'Account migration cape', rarity: 'epic' };
        }

        // Fallback to generic cape
        return {
            id: 'unknown_mojang_cape',
            name: 'Mojang Cape',
            description: 'Official Mojang cape',
            rarity: 'legendary'
        };
    }

    /**
     * Get texture URL with proper formatting for YNG Client
     * @param {string} textureUrl - Raw texture URL
     * @param {string} capeId - Cape ID for custom handling
     * @returns {string} Formatted texture URL
     */
    getFormattedTextureUrl(textureUrl, capeId) {
        if (!textureUrl) return null;

        // If it's already a complete URL, return as-is
        if (textureUrl.startsWith('http://') || textureUrl.startsWith('https://')) {
            console.log('[Mojang API] Using direct texture URL:', textureUrl);
            return textureUrl;
        }

        // If it's a relative path, construct full URL
        if (textureUrl.startsWith('/')) {
            const fullUrl = `https://textures.minecraft.net${textureUrl}`;
            console.log('[Mojang API] Constructed texture URL:', fullUrl);
            return fullUrl;
        }

        // If it's just a hash, construct full texture URL
        const fullUrl = `https://textures.minecraft.net/texture/${textureUrl}`;
        console.log('[Mojang API] Constructed texture URL from hash:', fullUrl);
        return fullUrl;
    }

    /**
     * Clear profile cache
     */
    clearCache() {
        this.profileCache.clear();
        console.log('[Mojang API] Cache cleared');
    }

    /**
     * Get skin URL from profile
     * @param {Object} profile - Mojang profile data
     * @returns {string|null} Skin URL
     */
    extractSkinUrl(profile) {
        if (!profile || !profile.properties) {
            return null;
        }

        try {
            const textureProperty = profile.properties.find(prop => prop.name === 'textures');
            if (!textureProperty) {
                return null;
            }

            const textureData = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString());
            
            if (textureData.textures && textureData.textures.SKIN) {
                return textureData.textures.SKIN.url;
            }
        } catch (error) {
            console.error('[Mojang API] Failed to extract skin URL:', error);
        }

        return null;
    }

    /**
     * Check if user has any official Mojang capes
     * @param {string} uuid - Minecraft UUID
     * @returns {Promise<boolean>} True if user has official capes
     */
    async hasOfficialCapes(uuid) {
        try {
            const capes = await this.getUserCapes(uuid);
            return capes.length > 0;
        } catch (error) {
            console.error('[Mojang API] Failed to check for official capes:', error);
            return false;
        }
    }

    /**
     * Get status of Mojang API
     * @returns {Promise<Object>} API status information
     */
    async getApiStatus() {
        try {
            const response = await axios.get('https://status.mojang.com/check', {
                timeout: 5000,
                headers: { 'User-Agent': 'YNG-Client/1.0.0' }
            });

            return {
                available: true,
                services: response.data,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[Mojang API] Failed to check API status:', error);
            return {
                available: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
}

module.exports = MojangAPIManager;