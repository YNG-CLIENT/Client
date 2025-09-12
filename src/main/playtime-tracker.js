const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class PlaytimeTracker {
  constructor() {
    this.dataPath = path.join(os.homedir(), '.yng-client', 'playtime.json');
    this.activeSessions = new Map();
    this.data = {
      totalPlaytime: 0,
      sessionCount: 0,
      lastPlayed: null,
      dailyStats: {},
      versionStats: {},
      serverStats: {}
    };
  }

  async loadData() {
    try {
      await fs.ensureDir(path.dirname(this.dataPath));
      
      if (await fs.pathExists(this.dataPath)) {
        const savedData = await fs.readJson(this.dataPath);
        this.data = { ...this.data, ...savedData };
      }
      
      return this.data;
    } catch (error) {
      console.error('Error loading playtime data:', error);
      return this.data;
    }
  }

  async saveData() {
    try {
      await fs.ensureDir(path.dirname(this.dataPath));
      await fs.writeJson(this.dataPath, this.data, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving playtime data:', error);
      return false;
    }
  }

  startSession(processId, version, server = null) {
    const sessionData = {
      startTime: Date.now(),
      version: version,
      server: server,
      lastUpdate: Date.now()
    };
    
    this.activeSessions.set(processId, sessionData);
    this.data.sessionCount++;
    this.data.lastPlayed = new Date().toISOString();
    
    console.log(`Started playtime tracking for ${version} (${processId})`);
  }

  updateSession(processId, serverInfo = null) {
    const session = this.activeSessions.get(processId);
    if (session) {
      session.lastUpdate = Date.now();
      if (serverInfo) {
        session.server = serverInfo;
      }
    }
  }

  endSession(processId) {
    const session = this.activeSessions.get(processId);
    if (!session) return 0;

    const sessionTime = Date.now() - session.startTime;
    const sessionTimeMinutes = Math.floor(sessionTime / 60000);
    
    // Update total playtime
    this.data.totalPlaytime += sessionTimeMinutes;
    
    // Update daily stats
    const today = new Date().toDateString();
    if (!this.data.dailyStats[today]) {
      this.data.dailyStats[today] = 0;
    }
    this.data.dailyStats[today] += sessionTimeMinutes;
    
    // Update version stats
    if (!this.data.versionStats[session.version]) {
      this.data.versionStats[session.version] = 0;
    }
    this.data.versionStats[session.version] += sessionTimeMinutes;
    
    // Update server stats
    if (session.server) {
      if (!this.data.serverStats[session.server]) {
        this.data.serverStats[session.server] = 0;
      }
      this.data.serverStats[session.server] += sessionTimeMinutes;
    }
    
    this.activeSessions.delete(processId);
    this.saveData();
    
    console.log(`Ended playtime tracking for ${session.version}: ${sessionTimeMinutes} minutes`);
    return sessionTimeMinutes;
  }

  getCurrentSession(processId) {
    const session = this.activeSessions.get(processId);
    if (!session) return null;
    
    const currentTime = Date.now() - session.startTime;
    return {
      ...session,
      currentPlaytime: Math.floor(currentTime / 60000),
      formattedTime: this.formatTime(currentTime)
    };
  }

  getStats() {
    return {
      ...this.data,
      activeSessions: this.activeSessions.size,
      formattedTotalTime: this.formatTime(this.data.totalPlaytime * 60000),
      todayPlaytime: this.getTodayPlaytime()
    };
  }

  getTodayPlaytime() {
    const today = new Date().toDateString();
    return this.data.dailyStats[today] || 0;
  }

  getWeeklyStats() {
    const weekStats = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      weekStats[dateString] = this.data.dailyStats[dateString] || 0;
    }
    
    return weekStats;
  }

  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  cleanup() {
    // Clean up old daily stats (keep last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    for (const dateString in this.data.dailyStats) {
      const date = new Date(dateString);
      if (date < cutoffDate) {
        delete this.data.dailyStats[dateString];
      }
    }
    
    this.saveData();
  }
}

module.exports = PlaytimeTracker;