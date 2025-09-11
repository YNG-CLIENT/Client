const DiscordRPC = require('discord-rpc');

/**
 * Discord Rich Presence Manager for YNG Client
 * Shows current activity and game status
 */
class DiscordRPCManager {
  constructor() {
    this.clientId = '1415814312852848681'; // Replace with your Discord app ID
    this.rpc = null;
    this.isConnected = false;
    this.currentActivity = null;
    this.gameStartTime = null;
    this.lastWorldInfo = null;
    
    this.init();
  }

  async init() {
    try {
      this.rpc = new DiscordRPC.Client({ transport: 'ipc' });
      
      this.rpc.on('ready', () => {
        console.log('Discord RPC connected');
        this.isConnected = true;
        this.setActivity('launcher', 'In Launcher');
      });

      this.rpc.on('disconnected', () => {
        console.log('Discord RPC disconnected');
        this.isConnected = false;
      });

      await this.rpc.login({ clientId: this.clientId });
    } catch (error) {
      console.log('Discord RPC not available:', error.message);
      this.isConnected = false;
    }
  }

  async setActivity(type, details, state = '', worldInfo = null) {
    if (!this.isConnected || !this.rpc) return;

    try {
      const activity = {
        details: details || 'YNG Client',
        state: state || 'Ready to play',
        largeImageKey: 'yng-logo', // Upload logo to Discord app assets
        largeImageText: 'YNG Client',
        instance: false,
      };

      // Ensure state is always a string and not empty
      if (!activity.state || activity.state === null || activity.state === undefined) {
        activity.state = 'Ready to play';
      }

      switch (type) {
        case 'launcher':
          activity.smallImageKey = 'launcher-icon';
          activity.smallImageText = 'In Launcher';
          activity.startTimestamp = Date.now();
          break;

        case 'menu':
          activity.smallImageKey = 'menu-icon';
          activity.smallImageText = 'Browsing Menu';
          activity.startTimestamp = Date.now();
          break;

        case 'game':
          activity.smallImageKey = this.getWorldIcon(worldInfo);
          activity.smallImageText = this.getWorldText(worldInfo);
          activity.startTimestamp = this.gameStartTime || Date.now();
          
          if (worldInfo) {
            activity.state = `${worldInfo.dimension} • ${worldInfo.biome}`;
            if (worldInfo.worldName) {
              activity.details = `Playing ${worldInfo.worldName}`;
            }
          }
          break;

        case 'downloading':
          activity.smallImageKey = 'download-icon';
          activity.smallImageText = 'Downloading';
          activity.startTimestamp = Date.now();
          break;
      }

      await this.rpc.setActivity(activity);
      this.currentActivity = activity;
    } catch (error) {
      console.error('Error setting Discord activity:', error);
    }
  }

  getWorldIcon(worldInfo) {
    if (!worldInfo) return 'overworld-icon';
    
    switch (worldInfo.dimension) {
      case 'the_nether':
        return 'nether-icon';
      case 'the_end':
        return 'end-icon';
      default:
        return 'overworld-icon';
    }
  }

  getWorldText(worldInfo) {
    if (!worldInfo) return 'Overworld';
    
    switch (worldInfo.dimension) {
      case 'the_nether':
        return 'The Nether';
      case 'the_end':
        return 'The End';
      default:
        return 'Overworld';
    }
  }

  // Launcher states
  async setLauncherActivity(screen) {
    const activities = {
      'home': { details: 'Home Screen', state: 'Ready to launch' },
      'versions': { details: 'Managing Versions', state: 'Browsing versions' },
      'settings': { details: 'Configuring Settings', state: 'Customizing launcher' },
      'about': { details: 'About YNG Client', state: 'Reading information' },
      'login': { details: 'Signing In', state: 'Authenticating' }
    };

    const activity = activities[screen] || { details: 'In Launcher', state: 'Browsing' };
    await this.setActivity('menu', activity.details, activity.state);
  }

  async setDownloadActivity(version, progress) {
    const state = `${Math.round(progress || 0)}% complete`;
    await this.setActivity('downloading', `Downloading Minecraft ${version}`, state);
  }

  async setGameActivity(worldInfo = null) {
    this.gameStartTime = this.gameStartTime || Date.now();
    this.lastWorldInfo = worldInfo || this.lastWorldInfo;
    
    const details = worldInfo?.worldName ? `Playing ${worldInfo.worldName}` : 'Playing Minecraft';
    await this.setActivity('game', details, null, this.lastWorldInfo);
  }

  async updateWorldInfo(worldInfo) {
    if (this.currentActivity?.smallImageKey?.includes('icon') && 
        this.currentActivity.smallImageKey !== 'launcher-icon' && 
        this.currentActivity.smallImageKey !== 'menu-icon') {
      this.lastWorldInfo = worldInfo;
      await this.setGameActivity(worldInfo);
    }
  }

  async clearActivity() {
    if (!this.isConnected || !this.rpc) return;
    
    try {
      await this.rpc.clearActivity();
      this.currentActivity = null;
      this.gameStartTime = null;
      this.lastWorldInfo = null;
    } catch (error) {
      console.error('Error clearing Discord activity:', error);
    }
  }

  async destroy() {
    if (this.rpc) {
      try {
        await this.clearActivity();
        this.rpc.destroy();
      } catch (error) {
        console.error('Error destroying Discord RPC:', error);
      }
    }
    this.isConnected = false;
  }
}

module.exports = DiscordRPCManager;