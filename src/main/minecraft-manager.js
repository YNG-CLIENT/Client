const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class MinecraftManager {
  constructor() {
    this.minecraftDir = path.join(os.homedir(), '.minecraft');
    this.versionsDir = path.join(this.minecraftDir, 'versions');
    this.librariesDir = path.join(this.minecraftDir, 'libraries');
    this.assetsDir = path.join(this.minecraftDir, 'assets');
    this.manifestUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    await fs.ensureDir(this.versionsDir);
    await fs.ensureDir(this.librariesDir);
    await fs.ensureDir(this.assetsDir);
  }

  async getVersionManifest() {
    try {
      console.log('Fetching version manifest...');
      const manifest = await this.makeHttpRequest(this.manifestUrl);
      return JSON.parse(manifest);
    } catch (error) {
      console.error('Failed to fetch version manifest:', error);
      throw new Error('Failed to fetch Minecraft versions');
    }
  }

  async downloadVersion(versionId, progressCallback) {
    try {
      progressCallback({ message: 'Loading version manifest...', percentage: 0 });
      
      const manifest = await this.getVersionManifest();
      const versionInfo = manifest.versions.find(v => v.id === versionId);
      
      if (!versionInfo) {
        throw new Error(`Version ${versionId} not found`);
      }

      progressCallback({ message: 'Downloading version info...', percentage: 10 });
      
      // Download version JSON
      const versionJson = await this.downloadVersionJson(versionInfo);
      
      progressCallback({ message: 'Downloading libraries...', percentage: 25 });
      
      // Download libraries
      await this.downloadLibraries(versionJson, progressCallback);
      
      progressCallback({ message: 'Downloading assets...', percentage: 65 });
      
      // Download assets
      await this.downloadAssets(versionJson, progressCallback);
      
      progressCallback({ message: 'Downloading client JAR...', percentage: 85 });
      
      // Download client JAR
      await this.downloadClientJar(versionJson);
      
      progressCallback({ message: 'Download complete!', percentage: 100 });
      
      return { success: true, version: versionJson };
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  async downloadVersionJson(versionInfo) {
    const versionDir = path.join(this.versionsDir, versionInfo.id);
    const versionJsonPath = path.join(versionDir, `${versionInfo.id}.json`);
    
    await fs.ensureDir(versionDir);
    
    // Check if already exists
    if (await fs.pathExists(versionJsonPath)) {
      return await fs.readJSON(versionJsonPath);
    }
    
    const versionJsonData = await this.makeHttpRequest(versionInfo.url);
    const versionJson = JSON.parse(versionJsonData);
    
    await fs.writeJSON(versionJsonPath, versionJson);
    return versionJson;
  }

  async downloadLibraries(versionJson, progressCallback) {
    const libraries = versionJson.libraries || [];
    const platform = this.getCurrentPlatform();
    
    let completed = 0;
    const validLibraries = libraries.filter(lib => this.shouldDownloadLibrary(lib, platform));
    
    for (const library of validLibraries) {
      try {
        await this.downloadLibrary(library);
        completed++;
        
        const percentage = 25 + Math.floor((completed / validLibraries.length) * 40);
        progressCallback({ 
          message: `Downloading libraries... (${completed}/${validLibraries.length})`, 
          percentage 
        });
      } catch (error) {
        console.error(`Failed to download library ${library.name}:`, error);
        // Continue with other libraries
      }
    }
  }

  shouldDownloadLibrary(library, platform) {
    if (library.rules) {
      for (const rule of library.rules) {
        if (rule.action === 'disallow') {
          if (!rule.os || this.matchesPlatform(rule.os, platform)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  matchesPlatform(osRule, platform) {
    if (osRule.name) {
      return osRule.name === platform;
    }
    return false;
  }

  getCurrentPlatform() {
    const platform = os.platform();
    switch (platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'osx';
      case 'linux': return 'linux';
      default: return 'unknown';
    }
  }

  async downloadLibrary(library) {
    const artifact = library.downloads?.artifact;
    if (!artifact) {
      console.warn(`No artifact found for library ${library.name}`);
      return;
    }

    const libraryPath = path.join(this.librariesDir, artifact.path);
    
    // Check if already exists and verify hash
    if (await fs.pathExists(libraryPath)) {
      const existingHash = await this.calculateSHA1(libraryPath);
      if (existingHash === artifact.sha1) {
        return; // Already downloaded and verified
      }
    }

    await fs.ensureDir(path.dirname(libraryPath));
    await this.downloadFile(artifact.url, libraryPath);
    
    // Verify hash
    const downloadedHash = await this.calculateSHA1(libraryPath);
    if (downloadedHash !== artifact.sha1) {
      throw new Error(`Hash mismatch for library ${library.name}`);
    }
  }

  async downloadAssets(versionJson, progressCallback) {
    if (!versionJson.assetIndex) {
      return;
    }

    const assetIndexPath = path.join(this.assetsDir, 'indexes', `${versionJson.assetIndex.id}.json`);
    await fs.ensureDir(path.dirname(assetIndexPath));
    
    // Download asset index
    if (!await fs.pathExists(assetIndexPath)) {
      await this.downloadFile(versionJson.assetIndex.url, assetIndexPath);
    }
    
    const assetIndex = await fs.readJSON(assetIndexPath);
    const assets = Object.entries(assetIndex.objects || {});
    
    let completed = 0;
    
    for (const [assetName, assetInfo] of assets) {
      try {
        await this.downloadAsset(assetInfo);
        completed++;
        
        const percentage = 65 + Math.floor((completed / assets.length) * 20);
        progressCallback({ 
          message: `Downloading assets... (${completed}/${assets.length})`, 
          percentage 
        });
      } catch (error) {
        console.error(`Failed to download asset ${assetName}:`, error);
        // Continue with other assets
      }
    }
  }

  async downloadAsset(assetInfo) {
    const hash = assetInfo.hash;
    const subPath = `${hash.substring(0, 2)}/${hash}`;
    const assetPath = path.join(this.assetsDir, 'objects', subPath);
    
    // Check if already exists
    if (await fs.pathExists(assetPath)) {
      const existingHash = await this.calculateSHA1(assetPath);
      if (existingHash === hash) {
        return;
      }
    }

    await fs.ensureDir(path.dirname(assetPath));
    const assetUrl = `https://resources.download.minecraft.net/${subPath}`;
    await this.downloadFile(assetUrl, assetPath);
  }

  async downloadClientJar(versionJson) {
    const clientDownload = versionJson.downloads?.client;
    if (!clientDownload) {
      throw new Error('Client download not found in version JSON');
    }

    const versionDir = path.join(this.versionsDir, versionJson.id);
    const clientJarPath = path.join(versionDir, `${versionJson.id}.jar`);
    
    // Check if already exists and verify hash
    if (await fs.pathExists(clientJarPath)) {
      const existingHash = await this.calculateSHA1(clientJarPath);
      if (existingHash === clientDownload.sha1) {
        return;
      }
    }

    await this.downloadFile(clientDownload.url, clientJarPath);
    
    // Verify hash
    const downloadedHash = await this.calculateSHA1(clientJarPath);
    if (downloadedHash !== clientDownload.sha1) {
      throw new Error('Client JAR hash mismatch');
    }
  }

  async downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (error) => {
          fs.unlink(filePath, () => {}); // Delete partial file
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  async makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve(data);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  async calculateSHA1(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  getVersionPath(versionId) {
    return path.join(this.versionsDir, versionId);
  }

  getVersionJson(versionId) {
    const versionPath = path.join(this.versionsDir, versionId, `${versionId}.json`);
    return fs.readJSON(versionPath);
  }

  getClientJarPath(versionId) {
    return path.join(this.versionsDir, versionId, `${versionId}.jar`);
  }
}

module.exports = MinecraftManager;