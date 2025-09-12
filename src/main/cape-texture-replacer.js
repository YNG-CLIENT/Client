/**
 * Cape Texture Replacement Manager for YNG Client
 * Handles replacing vanilla Minecraft cape textures with YNG cape system
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');

class CapeTextureReplacer {
    constructor() {
        this.gameDirectory = null;
        this.resourcePacksDir = null;
        this.yngResourcePack = null;
    }

    /**
     * Set the Minecraft game directory
     * @param {string} gameDir - Game directory path
     */
    setGameDirectory(gameDir) {
        this.gameDirectory = gameDir;
        this.resourcePacksDir = path.join(gameDir, 'resourcepacks');
        this.yngResourcePack = path.join(this.resourcePacksDir, 'YNG-Client-Capes');
    }

    /**
     * Initialize YNG cape resource pack
     * @returns {Promise<boolean>} Success status
     */
    async initializeResourcePack() {
        try {
            if (!this.gameDirectory) {
                console.error('Game directory not set');
                return false;
            }

            // Create resourcepacks directory if it doesn't exist
            await fs.mkdir(this.resourcePacksDir, { recursive: true });

            // Create YNG cape resource pack directory
            await fs.mkdir(this.yngResourcePack, { recursive: true });

            // Create pack.mcmeta
            const packMeta = {
                pack: {
                    pack_format: 15, // Latest format for 1.20+
                    description: "YNG Client Cape System\n§7Dynamic cape textures"
                }
            };

            await fs.writeFile(
                path.join(this.yngResourcePack, 'pack.mcmeta'),
                JSON.stringify(packMeta, null, 2)
            );

            // Create pack.png (YNG logo)
            await this.createPackIcon();

            // Create assets directory structure
            const assetsDir = path.join(this.yngResourcePack, 'assets', 'minecraft', 'textures', 'entity');
            await fs.mkdir(assetsDir, { recursive: true });

            console.log('YNG cape resource pack initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize resource pack:', error);
            return false;
        }
    }

    /**
     * Create a simple pack icon
     */
    async createPackIcon() {
        try {
            // Create a simple 64x64 PNG icon with YNG branding
            const iconData = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
                0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40, // 64x64 dimensions
                0x08, 0x02, 0x00, 0x00, 0x00, 0x25, 0x0B, 0xE6, // bit depth, color type, etc.
                0x89, 0x00, 0x00, 0x00, 0x09, 0x70, 0x48, 0x59, // pHYs chunk
                0x73, 0x00, 0x00, 0x0B, 0x13, 0x00, 0x00, 0x0B,
                0x13, 0x01, 0x00, 0x9A, 0x9C, 0x18, 0x00, 0x00,
                0x00, 0x17, 0x49, 0x44, 0x41, 0x54, 0x68, 0x43, // IDAT chunk (minimal data)
                0xED, 0xC1, 0x01, 0x0D, 0x00, 0x00, 0x00, 0xC2,
                0xA0, 0xF7, 0x4F, 0x6D, 0x0E, 0x37, 0xA0, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x2E, 0x29, 0x39, 0x4A,
                0x82, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND
                0x44, 0xAE, 0x42, 0x60, 0x82
            ]);

            await fs.writeFile(path.join(this.yngResourcePack, 'pack.png'), iconData);
        } catch (error) {
            console.warn('Failed to create pack icon:', error);
        }
    }

    /**
     * Replace cape texture for user
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeTextureUrl - URL to cape texture
     * @returns {Promise<boolean>} Success status
     */
    async replaceCapeTexture(mcUuid, capeTextureUrl) {
        try {
            if (!this.yngResourcePack) {
                console.error('Resource pack not initialized');
                return false;
            }

            // Download cape texture
            const capeData = await this.downloadTexture(capeTextureUrl);
            if (!capeData) {
                console.error('Failed to download cape texture');
                return false;
            }

            // Create user-specific cape texture
            const entityDir = path.join(this.yngResourcePack, 'assets', 'minecraft', 'textures', 'entity');
            const capeFileName = `cape_${mcUuid.replace(/-/g, '')}.png`;
            const capeFilePath = path.join(entityDir, capeFileName);

            await fs.writeFile(capeFilePath, capeData);

            // Update player skin to reference new cape
            await this.updatePlayerSkinMapping(mcUuid, capeFileName);

            console.log('Cape texture replaced for user:', mcUuid);
            return true;
        } catch (error) {
            console.error('Failed to replace cape texture:', error);
            return false;
        }
    }

    /**
     * Download texture from URL
     * @param {string} url - Texture URL
     * @returns {Promise<Buffer|null>} Texture data
     */
    async downloadTexture(url) {
        return new Promise((resolve) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            protocol.get(url, async (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirects
                    const redirectedData = await this.downloadTexture(response.headers.location);
                    resolve(redirectedData);
                    return;
                }
                
                if (response.statusCode !== 200) {
                    console.error('Failed to download texture:', response.statusCode);
                    resolve(null);
                    return;
                }

                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on('error', (error) => {
                console.error('Error downloading texture:', error);
                resolve(null);
            });
        });
    }

    /**
     * Update player skin mapping to use custom cape
     * @param {string} mcUuid - Minecraft UUID
     * @param {string} capeFileName - Cape file name
     */
    async updatePlayerSkinMapping(mcUuid, capeFileName) {
        try {
            // Create optifine-style player mapping
            const optifineDir = path.join(this.yngResourcePack, 'assets', 'minecraft', 'optifine', 'cit', 'yng');
            await fs.mkdir(optifineDir, { recursive: true });

            // Create properties file for this player
            const propertiesContent = `
# YNG Client Cape for ${mcUuid}
type=player
items=cape
model=cape
texture=${capeFileName}
nbt.SkullOwner.Id=${mcUuid}
`.trim();

            await fs.writeFile(
                path.join(optifineDir, `cape_${mcUuid.replace(/-/g, '')}.properties`),
                propertiesContent
            );

            // Also create a general cape override
            const generalPropertiesContent = `
# YNG Client Default Cape Override
type=item
items=elytra
model=cape
texture=${capeFileName}
`.trim();

            await fs.writeFile(
                path.join(optifineDir, 'default_cape.properties'),
                generalPropertiesContent
            );
        } catch (error) {
            console.error('Failed to update player skin mapping:', error);
        }
    }

    /**
     * Remove cape for user
     * @param {string} mcUuid - Minecraft UUID
     * @returns {Promise<boolean>} Success status
     */
    async removeCapeTexture(mcUuid) {
        try {
            if (!this.yngResourcePack) {
                return false;
            }

            // Remove cape texture file
            const entityDir = path.join(this.yngResourcePack, 'assets', 'minecraft', 'textures', 'entity');
            const capeFileName = `cape_${mcUuid.replace(/-/g, '')}.png`;
            const capeFilePath = path.join(entityDir, capeFileName);

            try {
                await fs.unlink(capeFilePath);
            } catch (error) {
                // File might not exist, that's okay
            }

            // Remove optifine mapping
            const optifineDir = path.join(this.yngResourcePack, 'assets', 'minecraft', 'optifine', 'cit', 'yng');
            const propertiesFile = path.join(optifineDir, `cape_${mcUuid.replace(/-/g, '')}.properties`);

            try {
                await fs.unlink(propertiesFile);
            } catch (error) {
                // File might not exist, that's okay
            }

            console.log('Cape texture removed for user:', mcUuid);
            return true;
        } catch (error) {
            console.error('Failed to remove cape texture:', error);
            return false;
        }
    }

    /**
     * Enable YNG resource pack in Minecraft options
     * @returns {Promise<boolean>} Success status
     */
    async enableResourcePack() {
        try {
            if (!this.gameDirectory) {
                return false;
            }

            const optionsFile = path.join(this.gameDirectory, 'options.txt');
            let optionsContent = '';

            // Read existing options
            try {
                optionsContent = await fs.readFile(optionsFile, 'utf8');
            } catch (error) {
                // File doesn't exist, create new one
                optionsContent = '';
            }

            // Parse options
            const options = new Map();
            const lines = optionsContent.split('\n');
            
            for (const line of lines) {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    options.set(key, valueParts.join(':'));
                }
            }

            // Update resource pack list
            const packName = 'YNG-Client-Capes';
            let resourcePacks = [];
            
            if (options.has('resourcePacks')) {
                const packList = options.get('resourcePacks');
                try {
                    resourcePacks = JSON.parse(packList);
                } catch (error) {
                    resourcePacks = [];
                }
            }

            // Add YNG pack if not already present
            if (!resourcePacks.includes(`"file/${packName}"`)) {
                resourcePacks.unshift(`"file/${packName}"`);
                options.set('resourcePacks', JSON.stringify(resourcePacks));
            }

            // Write updated options
            const newOptionsContent = Array.from(options.entries())
                .map(([key, value]) => `${key}:${value}`)
                .join('\n');

            await fs.writeFile(optionsFile, newOptionsContent);
            
            console.log('YNG resource pack enabled in Minecraft options');
            return true;
        } catch (error) {
            console.error('Failed to enable resource pack:', error);
            return false;
        }
    }

    /**
     * Check if resource pack is installed
     * @returns {Promise<boolean>} Installation status
     */
    async isResourcePackInstalled() {
        try {
            if (!this.yngResourcePack) {
                return false;
            }

            const packMetaPath = path.join(this.yngResourcePack, 'pack.mcmeta');
            await fs.access(packMetaPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get resource pack directory
     * @returns {string|null} Resource pack path
     */
    getResourcePackPath() {
        return this.yngResourcePack;
    }

    /**
     * Clean up old cape textures
     * @param {number} maxAge - Maximum age in days
     */
    async cleanupOldTextures(maxAge = 30) {
        try {
            if (!this.yngResourcePack) {
                return;
            }

            const entityDir = path.join(this.yngResourcePack, 'assets', 'minecraft', 'textures', 'entity');
            const files = await fs.readdir(entityDir);
            const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
            const now = Date.now();

            for (const file of files) {
                if (file.startsWith('cape_') && file.endsWith('.png')) {
                    const filePath = path.join(entityDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (now - stats.mtime.getTime() > maxAgeMs) {
                        await fs.unlink(filePath);
                        console.log('Cleaned up old cape texture:', file);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old textures:', error);
        }
    }
}

module.exports = CapeTextureReplacer;