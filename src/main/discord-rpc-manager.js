const DiscordRPC = require('discord-rpc');

/**
 * Enhanced Discord Rich Presence Manager for YNG Client
 * Shows current activity, game status, playtime, and server info
 */
class DiscordRPCManager {
  constructor() {
    this.clientId = '1415814312852848681'; // YNG Client Discord App ID
    this.rpc = null;
    this.isConnected = false;
    this.currentActivity = null;
    this.gameStartTime = null;
    this.launcherStartTime = Date.now();
    this.lastWorldInfo = null;
    
    this.init();
  }

  async init() {
    try {
      this.rpc = new DiscordRPC.Client({ transport: 'ipc' });
      
      this.rpc.on('ready', () => {
        console.log('Discord RPC connected');
        this.isConnected = true;
        this.setLauncherActivity();
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

  setLauncherActivity(details = 'In YNG Client Launcher', state = 'Browsing menu') {
    if (!this.isConnected) return;

    const activity = {
      details: details,
      state: state,
      startTimestamp: this.launcherStartTime,
      largeImageKey: 'yng_logo',
      largeImageText: 'YNG Client - Free Minecraft Launcher',
      smallImageKey: 'launcher_icon',
      smallImageText: 'v1.0.0',
      buttons: [
        {
          label: 'Download YNG Client',
          url: 'https://github.com/YNG-Client/Client'
        },
        {
          label: 'Join Discord Server',
          url: 'https://discord.gg/HuwxFHy239'
        }
      ]
    };

    this.updateActivity(activity);
  }

  setGameActivity(gameInfo) {
    if (!this.isConnected) return;

    const {
      version,
      server,
      playerCount,
      maxPlayers,
      gameMode,
      playtime,
      world,
      dimension,
      coordinates
    } = gameInfo || {};

    // Ensure we have a valid version
    const gameVersion = version || 'Unknown';
    this.gameStartTime = this.gameStartTime || Date.now();

    let state = 'Singleplayer';
    let partySize = null;
    let partyMax = null;

    if (server) {
      state = server.name || server.address || 'Multiplayer Server';
      if (playerCount && maxPlayers) {
        partySize = playerCount;
        partyMax = maxPlayers;
      }
    } else if (world) {
      state = `World: ${world}`;
      if (dimension && dimension !== 'overworld') {
        state += ` (${this.formatDimension(dimension)})`;
      }
    }

    if (gameMode) {
      state += ` • ${this.formatGameMode(gameMode)}`;
    }

    const activity = {
      details: `Playing Minecraft ${gameVersion}`,
      state: state,
      startTimestamp: this.gameStartTime,
      largeImageKey: this.getVersionIcon(gameVersion),
      largeImageText: `Minecraft ${gameVersion}`,
      smallImageKey: 'yng_logo',
      smallImageText: 'YNG Client',
      buttons: [
        {
          label: 'Get YNG Client',
          url: 'https://github.com/YNG-Client/Client'
        }
      ]
    };

    if (partySize && partyMax) {
      activity.partySize = partySize;
      activity.partyMax = partyMax;
    }

    // Add coordinates if available
    if (coordinates) {
      activity.state += ` • ${coordinates.x}, ${coordinates.z}`;
    }

    // Add server join button if it's a public server
    if (server && server.joinable && server.address) {
      activity.buttons.unshift({
        label: 'Join Server',
        url: `minecraft://connect/${server.address}`
      });
    }

    this.updateActivity(activity);
  }

  setMenuActivity(menuType) {
    const menuStates = {
      'main': 'Main Menu',
      'settings': 'Settings',
      'versions': 'Version Selection',
      'profiles': 'Profile Management',
      'servers': 'Server Browser',
      'mods': 'Mod Manager',
      'stats': 'Viewing Statistics'
    };

    this.setLauncherActivity('In YNG Client Launcher', menuStates[menuType] || 'Browsing menu');
  }

  setDownloadActivity(version, progress) {
    const state = progress ? `${Math.round(progress)}% complete` : 'Preparing download';
    this.setLauncherActivity(`Downloading Minecraft ${version}`, state);
  }

  updateActivity(activity) {
    if (!this.isConnected || !this.rpc) return;

    try {
      this.rpc.setActivity(activity);
      this.currentActivity = activity;
    } catch (error) {
      console.error('Error updating Discord activity:', error);
    }
  }

  clearActivity() {
    if (!this.isConnected || !this.rpc) return;

    try {
      this.rpc.clearActivity();
      this.currentActivity = null;
    } catch (error) {
      console.error('Error clearing Discord activity:', error);
    }
  }

  formatDimension(dimension) {
    const dimensionNames = {
      'overworld': 'Overworld',
      'the_nether': 'The Nether',
      'the_end': 'The End'
    };
    return dimensionNames[dimension] || dimension;
  }

  formatGameMode(gameMode) {
    const modes = {
      'survival': 'Survival',
      'creative': 'Creative',
      'adventure': 'Adventure',
      'spectator': 'Spectator'
    };
    return modes[gameMode] || gameMode;
  }

  getVersionIcon(version) {
    // Return different icons based on version type
    if (!version) return 'minecraft_icon';
    
    if (version.includes('1.21')) return 'minecraft_1_21';
    if (version.includes('1.20')) return 'minecraft_1_20';
    if (version.includes('1.19')) return 'minecraft_1_19';
    if (version.includes('snapshot')) return 'minecraft_snapshot';
    return 'minecraft_icon';
  }

  onGameStart(version) {
    this.gameStartTime = Date.now();
  }

  onGameEnd() {
    this.gameStartTime = null;
    this.setLauncherActivity();
  }

  disconnect() {
    if (this.rpc) {
      try {
        this.rpc.destroy();
        this.isConnected = false;
        this.currentActivity = null;
        console.log('Discord RPC disconnected');
      } catch (error) {
        console.error('Error disconnecting Discord RPC:', error);
      }
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  getCurrentActivity() {
    return this.currentActivity;
  }
}

module.exports = DiscordRPCManager;