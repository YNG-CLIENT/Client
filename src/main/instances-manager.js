const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class InstancesManager {
  constructor() {
    this.instancesDir = path.join(os.homedir(), '.minecraft', 'instances');
    this.instancesFile = path.join(this.instancesDir, 'instances.json');
    this.init();
  }

  async init() {
    try {
      // Ensure instances directory exists
      await fs.mkdir(this.instancesDir, { recursive: true });
      
      // Create instances file if it doesn't exist
      try {
        await fs.access(this.instancesFile);
      } catch {
        await fs.writeFile(this.instancesFile, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize instances manager:', error);
    }
  }

  async getAllInstances() {
    try {
      const data = await fs.readFile(this.instancesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load instances:', error);
      return [];
    }
  }

  async createInstance(instanceData) {
    try {
      const instances = await this.getAllInstances();
      
      // Add timestamp and validate data
      const newInstance = {
        id: instanceData.id || Date.now().toString(),
        name: instanceData.name,
        version: instanceData.version,
        modLoader: instanceData.modLoader || 'vanilla',
        description: instanceData.description || '',
        icon: instanceData.icon || '🎯',
        createdAt: new Date().toISOString(),
        lastPlayed: null,
        gameDir: path.join(this.instancesDir, instanceData.name.replace(/[^a-zA-Z0-9]/g, '_'))
      };

      // Create instance directory
      await fs.mkdir(newInstance.gameDir, { recursive: true });
      
      // Add to instances array
      instances.push(newInstance);
      
      // Save to file
      await fs.writeFile(this.instancesFile, JSON.stringify(instances, null, 2));
      
      return newInstance;
    } catch (error) {
      console.error('Failed to create instance:', error);
      throw error;
    }
  }

  async deleteInstance(instanceId) {
    try {
      const instances = await this.getAllInstances();
      const instanceIndex = instances.findIndex(i => i.id === instanceId);
      
      if (instanceIndex === -1) {
        throw new Error('Instance not found');
      }

      const instance = instances[instanceIndex];
      
      // Remove instance directory (optional - can be dangerous)
      // await fs.rmdir(instance.gameDir, { recursive: true });
      
      // Remove from array
      instances.splice(instanceIndex, 1);
      
      // Save to file
      await fs.writeFile(this.instancesFile, JSON.stringify(instances, null, 2));
      
      return true;
    } catch (error) {
      console.error('Failed to delete instance:', error);
      throw error;
    }
  }

  async updateInstance(instanceId, updateData) {
    try {
      const instances = await this.getAllInstances();
      const instanceIndex = instances.findIndex(i => i.id === instanceId);
      
      if (instanceIndex === -1) {
        throw new Error('Instance not found');
      }

      // Update instance data
      instances[instanceIndex] = {
        ...instances[instanceIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // Save to file
      await fs.writeFile(this.instancesFile, JSON.stringify(instances, null, 2));
      
      return instances[instanceIndex];
    } catch (error) {
      console.error('Failed to update instance:', error);
      throw error;
    }
  }

  async updateLastPlayed(instanceId) {
    return this.updateInstance(instanceId, {
      lastPlayed: new Date().toISOString()
    });
  }

  async getInstance(instanceId) {
    try {
      const instances = await this.getAllInstances();
      return instances.find(i => i.id === instanceId);
    } catch (error) {
      console.error('Failed to get instance:', error);
      return null;
    }
  }

  async duplicateInstance(instanceId, newName) {
    try {
      const originalInstance = await this.getInstance(instanceId);
      if (!originalInstance) {
        throw new Error('Original instance not found');
      }

      const duplicatedInstance = {
        ...originalInstance,
        id: Date.now().toString(),
        name: newName,
        createdAt: new Date().toISOString(),
        lastPlayed: null,
        gameDir: path.join(this.instancesDir, newName.replace(/[^a-zA-Z0-9]/g, '_'))
      };

      // Create new instance directory
      await fs.mkdir(duplicatedInstance.gameDir, { recursive: true });
      
      // Copy instance files (mods, config, etc.)
      try {
        await this.copyDirectory(originalInstance.gameDir, duplicatedInstance.gameDir);
      } catch (error) {
        console.warn('Failed to copy instance files:', error);
      }

      // Add to instances
      const instances = await this.getAllInstances();
      instances.push(duplicatedInstance);
      await fs.writeFile(this.instancesFile, JSON.stringify(instances, null, 2));

      return duplicatedInstance;
    } catch (error) {
      console.error('Failed to duplicate instance:', error);
      throw error;
    }
  }

  async copyDirectory(src, dest) {
    try {
      await fs.mkdir(dest, { recursive: true });
      const files = await fs.readdir(src);
      
      for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const stat = await fs.stat(srcPath);
        
        if (stat.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      console.error('Failed to copy directory:', error);
      throw error;
    }
  }

  async importInstance(instancePath) {
    try {
      // This would handle importing from various sources
      // For now, just a placeholder
      throw new Error('Import functionality not yet implemented');
    } catch (error) {
      console.error('Failed to import instance:', error);
      throw error;
    }
  }

  async exportInstance(instanceId, exportPath) {
    try {
      // This would handle exporting instances
      // For now, just a placeholder
      throw new Error('Export functionality not yet implemented');
    } catch (error) {
      console.error('Failed to export instance:', error);
      throw error;
    }
  }
}

module.exports = InstancesManager;