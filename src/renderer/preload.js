const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication methods
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    loginOffline: (username) => ipcRenderer.invoke('auth:loginOffline', username),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getProfile: () => ipcRenderer.invoke('auth:getProfile'),
    isLoggedIn: () => ipcRenderer.invoke('auth:isLoggedIn')
  },

  // Discord RPC methods
  discord: {
    setActivity: (type, details, state, worldInfo) => ipcRenderer.invoke('discord:setActivity', type, details, state, worldInfo),
    setLauncherActivity: (screen) => ipcRenderer.invoke('discord:setLauncherActivity', screen),
    setDownloadActivity: (version, progress) => ipcRenderer.invoke('discord:setDownloadActivity', version, progress),
    setGameActivity: (worldInfo) => ipcRenderer.invoke('discord:setGameActivity', worldInfo)
  },

  // Minecraft management methods
  minecraft: {
    getVersions: () => ipcRenderer.invoke('minecraft:getVersions'),
    downloadVersion: (versionId) => ipcRenderer.invoke('minecraft:downloadVersion', versionId),
    launch: (options) => ipcRenderer.invoke('minecraft:launch', options),
    onDownloadProgress: (callback) => ipcRenderer.on('minecraft:downloadProgress', callback),
    getDefaultDirectory: () => ipcRenderer.invoke('minecraft:getDefaultDirectory')
  },

  // App utility methods
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    selectFolder: () => ipcRenderer.invoke('app:selectFolder')
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // Auto-updater methods
  updater: {
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onUpdateAvailable: (callback) => ipcRenderer.on('updater:update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('updater:update-downloaded', callback)
  },

  // Settings management
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    reset: () => ipcRenderer.invoke('settings:reset')
  },

  // Playtime tracking
  playtime: {
    getStats: () => ipcRenderer.invoke('playtime:getStats'),
    getSessionHistory: (limit) => ipcRenderer.invoke('playtime:getSessionHistory', limit),
    getDailyStats: (days) => ipcRenderer.invoke('playtime:getDailyStats', days),
    getWeeklyStats: (weeks) => ipcRenderer.invoke('playtime:getWeeklyStats', weeks)
  },

  // Dialog methods for cape management
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
  },

  // File system methods for cape management
  fs: {
    readFile: (filePath, options) => ipcRenderer.invoke('fs:readFile', filePath, options)
  }
});