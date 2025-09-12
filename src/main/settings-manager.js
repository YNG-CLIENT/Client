const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class SettingsManager {
  constructor() {
    this.settingsPath = path.join(os.homedir(), '.yng-client', 'settings.json');
    this.defaultSettings = {
      // Game Settings
      memory: 2048,
      javaPath: 'auto',
      gameDirectory: path.join(os.homedir(), '.minecraft'),
      
      // Launcher Settings
      discordRPC: true,
      playtimeTracking: true,
      multipleInstances: false,
      autoLaunch: false,
      minimizeToTray: true,
      
      // UI Settings
      theme: 'dark',
      animations: true,
      notifications: true,
      showFPS: false,
      overlayEnabled: true,
      
      // Privacy Settings
      sharePlaytime: true,
      shareServerInfo: true,
      anonymousStats: false,
      
      // Advanced Settings
      debugMode: false,
      customJVMArgs: '',
      skipVersionCheck: false
    };
    this.settings = null;
  }

  async loadSettings() {
    try {
      await fs.ensureDir(path.dirname(this.settingsPath));
      
      if (await fs.pathExists(this.settingsPath)) {
        const settingsData = await fs.readJson(this.settingsPath);
        this.settings = { ...this.defaultSettings, ...settingsData };
      } else {
        this.settings = { ...this.defaultSettings };
        await this.saveSettings();
      }
      
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { ...this.defaultSettings };
      return this.settings;
    }
  }

  async saveSettings() {
    try {
      await fs.ensureDir(path.dirname(this.settingsPath));
      await fs.writeJson(this.settingsPath, this.settings, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  getSetting(key) {
    return this.settings ? this.settings[key] : this.defaultSettings[key];
  }

  async setSetting(key, value) {
    if (!this.settings) {
      await this.loadSettings();
    }
    
    this.settings[key] = value;
    return await this.saveSettings();
  }

  async updateSettings(newSettings) {
    if (!this.settings) {
      await this.loadSettings();
    }
    
    this.settings = { ...this.settings, ...newSettings };
    return await this.saveSettings();
  }

  getAllSettings() {
    return this.settings || this.defaultSettings;
  }

  resetSettings() {
    this.settings = { ...this.defaultSettings };
    return this.saveSettings();
  }
}

module.exports = SettingsManager;