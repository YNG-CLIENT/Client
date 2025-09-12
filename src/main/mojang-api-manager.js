/**
 * Mojang API Integration for YNG Client
 * Handles fetching user profile data, skins, and capes from Mojang
 */

const axios = require('axios');

class MojangAPIManager {
    constructor() {
        this.baseURL = 'https://api.mojang.com';
        this.sessionURL = 'https://sessionserver.mojang.com';
        this.profileCache = new Map();
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
            if (this.profileCache.has(cleanUuid)) {
                const cached = this.profileCache.get(cleanUuid);
                if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                    return cached.data;
                }
            }

            // Fetch profile with textures
            const response = await axios.get(
                `${this.sessionURL}/session/minecraft/profile/${cleanUuid}`,
                {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'YNG-Client/1.0.0'
                    }
                }
            );

            if (response.data) {
                // Cache the result
                this.profileCache.set(cleanUuid, {
                    data: response.data,
                    timestamp: Date.now()
                });
                
                return response.data;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to fetch Mojang profile:', error.message);
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
            return capes;
        }

        try {
            // Find textures property
            const textureProperty = profile.properties.find(prop => prop.name === 'textures');
            if (!textureProperty) {
                return capes;
            }

            // Decode base64 texture data
            const textureData = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString());
            
            if (textureData.textures && textureData.textures.CAPE) {
                const capeTexture = textureData.textures.CAPE;
                
                // Identify cape type from URL
                const capeInfo = this.identifyCapeFromUrl(capeTexture.url);
                
                capes.push({
                    id: capeInfo.id,
                    name: capeInfo.name,
                    description: capeInfo.description,
                    texture: capeTexture.url,
                    type: 'mojang',
                    rarity: capeInfo.rarity || 'legendary',
                    owned: true,
                    source: 'mojang_profile'
                });
            }
        } catch (error) {
            console.error('Failed to extract cape data:', error);
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
            
            // Try the new capes API endpoint
            const response = await axios.get(
                `https://api.minecraftservices.com/minecraft/profile/${cleanUuid}/capes`,
                {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'YNG-Client/1.0.0'
                    }
                }
            );

            if (response.data && response.data.capes) {
                return response.data.capes.map(cape => ({
                    id: this.generateCapeId(cape.alias || cape.id),
                    name: cape.alias || 'Unknown Cape',
                    description: `Mojang cape: ${cape.alias || 'Unknown'}`,
                    texture: cape.url,
                    type: 'mojang',
                    rarity: this.getCapeRarity(cape.alias),
                    owned: true,
                    active: cape.state === 'ACTIVE',
                    mojangId: cape.id,
                    source: 'mojang_api'
                }));
            }
            
            return [];
        } catch (error) {
            console.warn('Failed to fetch user capes from new API, trying fallback:', error.message);
            
            // Fallback to profile-based cape detection
            const profile = await this.getUserProfile(uuid);
            return this.extractCapes(profile);
        }
    }

    /**
     * Generate consistent cape ID from alias
     * @param {string} alias - Cape alias
     * @returns {string} Cape ID
     */
    generateCapeId(alias) {
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
            'translator': 'epic',
            'mojang': 'legendary',
            'cobalt': 'rare',
            'scrolls': 'rare',
            'migrator': 'epic'
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
            // Add more known cape hashes as needed
        };

        // Extract texture hash from URL
        const hashMatch = url.match(/texture\/([a-f0-9]+)/);
        if (hashMatch && knownCapes[hashMatch[1]]) {
            return knownCapes[hashMatch[1]];
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
     * Clear profile cache
     */
    clearCache() {
        this.profileCache.clear();
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
            console.error('Failed to extract skin URL:', error);
        }

        return null;
    }
}

module.exports = MojangAPIManager;