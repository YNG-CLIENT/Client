const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const AuthManager = require('./main/auth-manager');
const MinecraftManager = require('./main/minecraft-manager');
const LauncherManager = require('./main/launcher-manager');
const DiscordRPCManager = require('./main/discord-rpc-manager');

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
    
    this.initializeApp();
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
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
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
        return await this.launcherManager.launchMinecraft(options);
      } catch (error) {
        console.error('Launch error:', error);
        throw error;
      }
    });

    // Utility IPC handlers
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:selectFolder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Minecraft Directory'
      });
      return result.filePaths[0];
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
}

// Initialize the application
new YNGClient();