const https = require('https');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { BrowserWindow } = require('electron');

/**
 * Authentication Manager for YNG Client
 * Supports both Microsoft OAuth2 and offline mode
 */
class AuthManager {
  constructor() {
    this.tokenFile = path.join(os.homedir(), '.yng-client', 'auth.json');
    this.offlineFile = path.join(os.homedir(), '.yng-client', 'offline.json');
    
    // Real Microsoft OAuth2 client ID - Replace with your registered app
    this.clientId = '61f422d3-a1d5-4c0e-8113-20f9b653f328';
    this.redirectUri = 'https://login.live.com/oauth20_desktop.srf';
    this.scope = 'XboxLive.signin offline_access';
    
    this.currentUser = null;
    this.isOfflineMode = false;
    this.authWindow = null;
    
    this.ensureConfigDir();
  }

  async ensureConfigDir() {
    const configDir = path.dirname(this.tokenFile);
    await fs.ensureDir(configDir);
  }

  generateAuthUrl() {
    const state = uuidv4();
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      url: `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`,
      codeVerifier,
      state
    };
  }

  async login() {
    try {
      return new Promise((resolve, reject) => {
        // Create authentication window
        this.authWindow = new BrowserWindow({
          width: 500,
          height: 700,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        const authData = this.generateAuthUrl();
        
        this.authWindow.loadURL(authData.url);
        
        this.authWindow.once('ready-to-show', () => {
          this.authWindow.show();
        });

        // Handle the redirect
        this.authWindow.webContents.on('will-redirect', async (event, url) => {
          if (url.startsWith(this.redirectUri)) {
            const urlParams = new URL(url);
            const code = urlParams.searchParams.get('code');
            const state = urlParams.searchParams.get('state');
            
            if (code && state === authData.state) {
              try {
                const tokens = await this.exchangeCodeForTokens(code, authData.codeVerifier);
                const xboxToken = await this.authenticateWithXboxLive(tokens.access_token);
                const minecraftToken = await this.authenticateWithMinecraft(xboxToken);
                const profile = await this.getMinecraftProfile(minecraftToken);
                
                // Save authentication data
                const authenticationData = {
                  microsoftTokens: tokens,
                  xboxToken,
                  minecraftToken,
                  profile,
                  timestamp: Date.now()
                };
                
                await fs.writeJSON(this.tokenFile, authenticationData);
                this.currentUser = profile;
                this.isOfflineMode = false;
                
                this.authWindow.close();
                resolve(profile);
              } catch (error) {
                this.authWindow.close();
                reject(error);
              }
            } else {
              this.authWindow.close();
              reject(new Error('Invalid authorization response'));
            }
          }
        });

        this.authWindow.on('closed', () => {
          this.authWindow = null;
          reject(new Error('Authentication window was closed'));
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async loginOffline(username = null) {
    try {
      const playerName = username || `Player${Math.floor(Math.random() * 10000)}`;
      const offlineUuid = this.generateOfflineUUID(playerName);
      
      const offlineProfile = {
        id: offlineUuid,
        name: playerName,
        skinUrl: `https://crafatar.com/avatars/${offlineUuid}?size=128&default=MHF_Steve&overlay`,
        isOffline: true,
        playTime: 0,
        launches: 0,
        lastPlayed: null
      };
      
      // Save offline profile
      await fs.writeJSON(this.offlineFile, {
        profile: offlineProfile,
        timestamp: Date.now(),
        playTime: 0,
        launches: 0
      });
      
      this.currentUser = offlineProfile;
      this.isOfflineMode = true;
      
      return offlineProfile;
    } catch (error) {
      console.error('Offline login error:', error);
      throw error;
    }
  }

  generateOfflineUUID(username) {
    // Generate offline UUID based on username (like Minecraft does)
    const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-3${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  async exchangeCodeForTokens(code, codeVerifier) {
    const tokenData = new URLSearchParams({
      client_id: this.clientId,
      code: code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    });

    const response = await this.makeRequest('POST', 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token', tokenData.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    if (!response.access_token) {
      throw new Error('Failed to obtain access token');
    }

    return response;
  }

  async authenticateWithXboxLive(accessToken) {
    const xblData = {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${accessToken}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    };

    const response = await this.makeRequest('POST', 'https://user.auth.xboxlive.com/user/authenticate', JSON.stringify(xblData), {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (!response.Token) {
      throw new Error('Failed to authenticate with Xbox Live');
    }

    return response;
  }

  async authenticateWithMinecraft(xboxToken) {
    const xstsData = {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xboxToken.Token]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    };

    const xstsResponse = await this.makeRequest('POST', 'https://xsts.auth.xboxlive.com/xsts/authorize', JSON.stringify(xstsData), {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (!xstsResponse.Token) {
      throw new Error('Failed to authenticate with XSTS');
    }

    // Get Minecraft token
    const mcData = {
      identityToken: `XBL3.0 x=${xstsResponse.DisplayClaims.xui[0].uhs};${xstsResponse.Token}`
    };

    const mcResponse = await this.makeRequest('POST', 'https://api.minecraftservices.com/authentication/login_with_xbox', JSON.stringify(mcData), {
      'Content-Type': 'application/json'
    });

    if (!mcResponse.access_token) {
      throw new Error('Failed to authenticate with Minecraft');
    }

    return mcResponse.access_token;
  }

  async getMinecraftProfile(accessToken) {
    const profile = await this.makeRequest('GET', 'https://api.minecraftservices.com/minecraft/profile', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    if (!profile.id) {
      throw new Error('Failed to get Minecraft profile - account may not own Minecraft');
    }

    return {
      id: profile.id,
      name: profile.name,
      skinUrl: `https://crafatar.com/avatars/${profile.id}?size=128&overlay`,
      isOffline: false,
      playTime: 0,
      launches: 0,
      lastPlayed: null
    };
  }

  async isLoggedIn() {
    try {
      // Check offline mode first
      if (await fs.pathExists(this.offlineFile)) {
        const offlineData = await fs.readJSON(this.offlineFile);
        if (offlineData.profile) {
          this.currentUser = offlineData.profile;
          this.isOfflineMode = true;
          return true;
        }
      }

      // Check online authentication
      if (await fs.pathExists(this.tokenFile)) {
        const tokenData = await fs.readJSON(this.tokenFile);
        if (tokenData.profile && tokenData.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
          this.currentUser = tokenData.profile;
          this.isOfflineMode = false;
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  async getProfile() {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to load from saved data
    try {
      if (this.isOfflineMode && await fs.pathExists(this.offlineFile)) {
        const offlineData = await fs.readJSON(this.offlineFile);
        return offlineData.profile;
      }

      if (!this.isOfflineMode && await fs.pathExists(this.tokenFile)) {
        const tokenData = await fs.readJSON(this.tokenFile);
        return tokenData.profile;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }

    return null;
  }

  async logout() {
    try {
      this.currentUser = null;
      this.isOfflineMode = false;

      // Remove saved authentication data
      if (await fs.pathExists(this.tokenFile)) {
        await fs.remove(this.tokenFile);
      }
      if (await fs.pathExists(this.offlineFile)) {
        await fs.remove(this.offlineFile);
      }

      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async updatePlaytime(minutes) {
    try {
      if (this.isOfflineMode && await fs.pathExists(this.offlineFile)) {
        const offlineData = await fs.readJSON(this.offlineFile);
        offlineData.playTime = (offlineData.playTime || 0) + minutes;
        offlineData.profile.playTime = offlineData.playTime;
        offlineData.profile.lastPlayed = new Date().toISOString();
        await fs.writeJSON(this.offlineFile, offlineData);
        this.currentUser = offlineData.profile;
      }
    } catch (error) {
      console.error('Error updating playtime:', error);
    }
  }

  async incrementLaunches() {
    try {
      if (this.isOfflineMode && await fs.pathExists(this.offlineFile)) {
        const offlineData = await fs.readJSON(this.offlineFile);
        offlineData.launches = (offlineData.launches || 0) + 1;
        offlineData.profile.launches = offlineData.launches;
        await fs.writeJSON(this.offlineFile, offlineData);
        this.currentUser = offlineData.profile;
      }
    } catch (error) {
      console.error('Error incrementing launches:', error);
    }
  }

  async makeRequest(method, url, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: headers
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${parsedData.error_description || parsedData.error || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(data);
      }

      req.end();
    });
  }
}

module.exports = AuthManager;