const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const AuthManager = require('./main/auth-manager');
const MinecraftManager = require('./main/minecraft-manager');
const LauncherManager = require('./main/launcher-manager');
const DiscordRPCManager = require('./main/discord-rpc-manager');
const SettingsManager = require('./main/settings-manager');
const PlaytimeTracker = require('./main/playtime-tracker');
const InstancesManager = require('./main/instances-manager');
const ApiManager = require('./main/api-manager');
const config = require('./main/config');

// Add GPU workarounds for Windows
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-software-rasterizer');
  app.commandLine.appendSwitch('--disable-gpu-compositing');
  app.commandLine.appendSwitch('--no-sandbox');
}

class YNGClient {
  constructor() {
    this.mainWindow = null;
    this.authManager = new AuthManager();
    this.minecraftManager = new MinecraftManager();
    this.launcherManager = new LauncherManager();
    this.discordRPC = new DiscordRPCManager();
    this.settingsManager = new SettingsManager();
    this.playtimeTracker = new PlaytimeTracker();
    this.instancesManager = new InstancesManager();
    this.apiManager = ApiManager;
    
    // Initialize settings before app ready
    this.initializeManagers();
    this.initializeApp();
  }

  async initializeManagers() {
    try {
      await this.settingsManager.loadSettings();
      console.log('Settings manager initialized');
    } catch (error) {
      console.error('Failed to initialize settings manager:', error);
    }
  }

  initializeApp() {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();
      this.setupAutoUpdater();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      resizable: true,
      maximizable: true,
      fullscreenable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'renderer', 'preload.js'),
        webSecurity: true,
        experimentalFeatures: false
      },
      titleBarStyle: 'default',
      title: 'YNG Client',
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      show: false,
      autoHideMenuBar: true
    });

    // Load the main HTML file
    this.mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      // Open dev tools to debug black screen issue
      if (process.argv.includes('--dev')) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle crashes gracefully
    this.mainWindow.webContents.on('crashed', () => {
      console.error('Main window crashed');
      // Optionally restart the window
      this.createWindow();
    });

    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Render process gone:', details);
    });

    // Development mode
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  setupIPC() {
    // Authentication IPC handlers
    ipcMain.handle('auth:login', async () => {
      try {
        const profile = await this.authManager.login();
        this.discordRPC.setLauncherActivity('home');
        return { success: true, profile };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:loginOffline', async (event, username) => {
      try {
        const profile = await this.authManager.loginOffline(username);
        this.discordRPC.setLauncherActivity('home');
        return { success: true, profile };
      } catch (error) {
        console.error('Offline login error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:logout', async () => {
      try {
        await this.authManager.logout();
        this.discordRPC.setLauncherActivity('login');
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:getProfile', async () => {
      return await this.authManager.getProfile();
    });

    ipcMain.handle('auth:isLoggedIn', async () => {
      return await this.authManager.isLoggedIn();
    });

    // Settings IPC handlers
    ipcMain.handle('settings:get', (event, key) => {
      return this.settingsManager.getSetting(key);
    });

    ipcMain.handle('settings:set', async (event, key, value) => {
      return await this.settingsManager.setSetting(key, value);
    });

    ipcMain.handle('settings:getAll', () => {
      return this.settingsManager.getAllSettings();
    });

    ipcMain.handle('settings:reset', async () => {
      return await this.settingsManager.resetSettings();
    });

    // Playtime tracking IPC handlers
    ipcMain.handle('playtime:getStats', () => {
      return this.playtimeTracker.getStats();
    });

    ipcMain.handle('playtime:getSessionHistory', (event, limit) => {
      // Use getStats for now since getSessionHistory doesn't exist
      return this.playtimeTracker.getStats();
    });

    ipcMain.handle('playtime:getDailyStats', (event, days) => {
      // Return today's stats from the main getStats method
      const stats = this.playtimeTracker.getStats();
      return [{
        totalPlaytime: stats.todayPlaytime || 0,
        sessionCount: 1, // Placeholder
        firstSession: Date.now() - (stats.todayPlaytime || 0) * 60000,
        lastSession: Date.now()
      }];
    });

    ipcMain.handle('playtime:getWeeklyStats', (event, weeks) => {
      return [this.playtimeTracker.getWeeklyStats()];
    });

    // Discord RPC handlers
    ipcMain.handle('discord:setActivity', async (event, type, details, state, worldInfo) => {
      return this.discordRPC.setActivity(type, details, state, worldInfo);
    });

    ipcMain.handle('discord:setLauncherActivity', async (event, screen) => {
      return this.discordRPC.setLauncherActivity(screen);
    });

    ipcMain.handle('discord:setDownloadActivity', async (event, version, progress) => {
      return this.discordRPC.setDownloadActivity(version, progress);
    });

    ipcMain.handle('discord:setGameActivity', async (event, worldInfo) => {
      return this.discordRPC.setGameActivity(worldInfo);
    });

    // Minecraft version management
    ipcMain.handle('minecraft:getVersions', async () => {
      return await this.minecraftManager.getVersionManifest();
    });

    ipcMain.handle('minecraft:downloadVersion', async (event, versionId) => {
      return await this.minecraftManager.downloadVersion(versionId, (progress) => {
        this.mainWindow.webContents.send('minecraft:downloadProgress', progress);
      });
    });

    // Game launching
    ipcMain.handle('minecraft:launch', async (event, options) => {
      try {
        // Validate options
        const versionId = options?.versionId || options?.version;
        const username = options?.user?.name || options?.username || 'Unknown';
        
        if (!versionId) {
          throw new Error('Version ID is required for launching');
        }
        
        // Start playtime tracking
        this.playtimeTracker.startSession(versionId, username);
        
        // Update Discord RPC
        this.discordRPC.onGameStart(versionId);
        this.discordRPC.setGameActivity({
          version: versionId,
          world: options?.worldName || 'New World'
        });

        const result = await this.launcherManager.launchMinecraft(options);
        
        // Setup game process monitoring for playtime
        if (result.success && result.process) {
          result.process.on('exit', () => {
            this.playtimeTracker.endSession();
            this.discordRPC.onGameEnd();
          });
        }
        
        return result;
      } catch (error) {
        console.error('Launch error:', error);
        this.playtimeTracker.endSession();
        this.discordRPC.onGameEnd();
        throw error;
      }
    });

    // Utility IPC handlers
    ipcMain.handle('app:getVersion', () => {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        return packageJson.version;
      } catch (error) {
        console.error('Failed to read version from package.json:', error);
        return app.getVersion();
      }
    });

    ipcMain.handle('app:checkForUpdates', async () => {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        const currentVersion = packageJson.version;
        
        const response = await axios.get('https://api.github.com/repos/YNG-Client/Client/releases/latest');
        const latestVersion = response.data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
        
        const isUpdateAvailable = this.compareVersions(latestVersion, currentVersion) > 0;
        
        return {
          currentVersion,
          latestVersion,
          isUpdateAvailable,
          downloadUrl: response.data.html_url
        };
      } catch (error) {
        console.error('Failed to check for updates:', error);
        return {
          currentVersion: app.getVersion(),
          latestVersion: null,
          isUpdateAvailable: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('app:openGitHub', () => {
      require('electron').shell.openExternal('https://github.com/YNG-Client/Client');
    });

    ipcMain.handle('app:openDiscord', () => {
      require('electron').shell.openExternal('https://discord.gg/HuwxFHy239');
    });

    ipcMain.handle('app:selectFolder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Minecraft Directory'
      });
      return result.filePaths[0];
    });

    // Instances IPC handlers
    ipcMain.handle('instances:getAll', async () => {
      try {
        return await this.instancesManager.getAllInstances();
      } catch (error) {
        console.error('Failed to get instances:', error);
        return [];
      }
    });

    ipcMain.handle('instances:create', async (event, instanceData) => {
      try {
        return await this.instancesManager.createInstance(instanceData);
      } catch (error) {
        console.error('Failed to create instance:', error);
        throw error;
      }
    });

    ipcMain.handle('instances:delete', async (event, instanceId) => {
      try {
        return await this.instancesManager.deleteInstance(instanceId);
      } catch (error) {
        console.error('Failed to delete instance:', error);
        throw error;
      }
    });

    ipcMain.handle('instances:update', async (event, instanceId, updateData) => {
      try {
        return await this.instancesManager.updateInstance(instanceId, updateData);
      } catch (error) {
        console.error('Failed to update instance:', error);
        throw error;
      }
    });

    ipcMain.handle('instances:duplicate', async (event, instanceId, newName) => {
      try {
        return await this.instancesManager.duplicateInstance(instanceId, newName);
      } catch (error) {
        console.error('Failed to duplicate instance:', error);
        throw error;
      }
    });

    ipcMain.handle('instances:import', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          title: 'Import Instance',
          properties: ['openFile'],
          filters: [
            { name: 'Instance Files', extensions: ['zip', 'tar', 'tar.gz'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return await this.instancesManager.importInstance(result.filePaths[0]);
        }
        return { success: false, error: 'No file selected' };
      } catch (error) {
        console.error('Failed to import instance:', error);
        throw error;
      }
    });

    // Window control handlers
    ipcMain.handle('window:minimize', () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    });

    ipcMain.handle('window:close', () => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    });

    // Minecraft directory helper
    ipcMain.handle('minecraft:getDefaultDirectory', () => {
      return this.minecraftManager.getDefaultGameDirectory();
    });

    // Dialog and file system handlers for cape management
    ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('fs:readFile', async (event, filePath, options) => {
      const fs = require('fs').promises;
      try {
        const data = await fs.readFile(filePath, options);
        return data;
      } catch (error) {
        console.error('Failed to read file:', error);
        throw error;
      }
    });

    // API IPC handlers for cape management
    ipcMain.handle('api:authenticate', async (event, mcUuid, mcUsername) => {
      try {
        const result = await this.apiManager.authenticateUser(mcUuid, mcUsername);
        return { success: true, ...result };
      } catch (error) {
        console.error('API authentication error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('api:getUserCapes', async (event, mcUuid) => {
      try {
        const capes = await this.apiManager.getUserCapes(mcUuid);
        return { success: true, capes };
      } catch (error) {
        console.error('API get user capes error:', error);
        return { success: false, error: error.message, capes: [] };
      }
    });

    ipcMain.handle('api:getAllCapes', async () => {
      try {
        const capes = await this.apiManager.getAllCapes();
        return { success: true, capes };
      } catch (error) {
        console.error('API get all capes error:', error);
        return { success: false, error: error.message, capes: [] };
      }
    });

    ipcMain.handle('api:selectCape', async (event, mcUuid, capeId) => {
      try {
        const result = await this.apiManager.selectCape(mcUuid, capeId);
        return { success: true, ...result };
      } catch (error) {
        console.error('API select cape error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('api:getCapeTextureUrl', (event, capeId) => {
      return this.apiManager.getCapeTextureUrl(capeId);
    });

    ipcMain.handle('api:updateUserStats', async (event, mcUuid, stats) => {
      try {
        const result = await this.apiManager.updateUserStats(mcUuid, stats);
        return { success: true, ...result };
      } catch (error) {
        console.error('API update stats error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('api:checkCapeUnlock', async (event, mcUuid, capeId) => {
      try {
        const unlocked = await this.apiManager.checkCapeUnlock(mcUuid, capeId);
        return { success: true, unlocked };
      } catch (error) {
        console.error('API check cape unlock error:', error);
        return { success: false, error: error.message, unlocked: false };
      }
    });

    ipcMain.handle('api:isAuthenticated', () => {
      return this.apiManager.isUserAuthenticated();
    });

    ipcMain.handle('api:getCurrentUser', () => {
      return this.apiManager.getCurrentUser();
    });

    ipcMain.handle('api:logout', () => {
      this.apiManager.logout();
      return { success: true };
    });

    ipcMain.handle('api:getConfig', () => {
      return {
        apiUrl: config.API_BASE_URL,
        endpoints: config.API_ENDPOINTS,
        isDevelopment: config.isDevelopment(),
        isDebugMode: config.isDebugMode()
      };
    });
  }

  setupAutoUpdater() {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      this.mainWindow.webContents.send('updater:update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      this.mainWindow.webContents.send('updater:update-downloaded');
    });

    ipcMain.handle('updater:quitAndInstall', () => {
      autoUpdater.quitAndInstall();
    });
  }

  // Helper method to compare version strings (e.g., "1.2.3" vs "1.2.4")
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}

// Initialize the application
new YNGClient();