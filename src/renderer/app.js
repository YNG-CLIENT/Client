class YNGClientApp {
  constructor() {
    this.currentUser = null;
    this.selectedVersion = null;
    this.isLoggedIn = false;
    this.versions = [];
    this.settings = this.loadSettings();
    this.currentScreen = 'login';
    
    this.initializeApp();
  }

  async initializeApp() {
    this.createParticleEffect();
    this.setupEventListeners();
    this.loadAppVersion();
    this.setupAutoUpdater();
    
    // Check if user is already logged in
    try {
      this.isLoggedIn = await window.electronAPI.auth.isLoggedIn();
      if (this.isLoggedIn) {
        await this.loadUserProfile();
        this.showMainInterface();
        // Load versions after showing main interface
        this.loadVersions();
      } else {
        this.showLoginInterface();
      }
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      this.showLoginInterface();
    }
  }

  createParticleEffect() {
    const animatedBg = document.querySelector('.animated-bg');
    if (!animatedBg) return;

    // Create 5 floating particles
    for (let i = 0; i < 5; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      animatedBg.appendChild(particle);
    }
  }

  setupEventListeners() {
    // Microsoft login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }

    // Offline mode button
    const offlineBtn = document.getElementById('offlineBtn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', () => this.handleOfflineMode());
    }

    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = item.dataset.screen;
        if (screen) {
          this.showScreen(screen);
        }
      });
    });

    // Window controls (if they exist)
    this.setupWindowControls();

    // Download progress
    window.electronAPI.minecraft.onDownloadProgress((event, progress) => {
      this.updateDownloadProgress(progress);
    });
  }

  setupWindowControls() {
    const minimizeBtn = document.getElementById('minimize');
    const maximizeBtn = document.getElementById('maximize');
    const closeBtn = document.getElementById('close');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        window.electronAPI.window.minimize();
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        window.electronAPI.window.maximize();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.electronAPI.window.close();
      });
    }
  }

  async loadAppVersion() {
    try {
      const version = await window.electronAPI.app.getVersion();
      const versionElement = document.querySelector('.version-info span');
      if (versionElement) {
        versionElement.textContent = `v${version}`;
      }
    } catch (error) {
      console.error('Failed to load app version:', error);
    }
  }

  setupAutoUpdater() {
    window.electronAPI.updater.onUpdateAvailable(() => {
      const updateDot = document.querySelector('.update-dot');
      if (updateDot) {
        updateDot.style.background = 'var(--warning)';
      }
      this.showNotification('Update available! Downloading...', 'info');
    });

    window.electronAPI.updater.onUpdateDownloaded(() => {
      const updateDot = document.querySelector('.update-dot');
      if (updateDot) {
        updateDot.style.background = 'var(--success)';
      }
      this.showNotification('Update downloaded! Restart to apply.', 'success');
    });
  }

  showLoginInterface() {
    // Hide sidebar and show login container
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const loginContainer = document.querySelector('.login-container');
    
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'grid';
  }

  showMainInterface() {
    // Clear any demo data first
    this.clearDemoData();
    
    // Show sidebar and main content, hide login
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const loginContainer = document.querySelector('.login-container');
    
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'flex';
    if (loginContainer) loginContainer.style.display = 'none';
    
    // Ensure we have user data before showing interface
    if (!this.currentUser) {
      console.warn('No user data available, returning to login');
      this.showLoginInterface();
      return;
    }
    
    // Show home screen by default
    this.showScreen('home');
    this.loadVersions();
  }

  clearDemoData() {
    // Clear any demo or placeholder data
    const usernameElements = document.querySelectorAll('#username, .user-name, .profile-name');
    const playTimeElement = document.getElementById('playTime');
    const launchCountElement = document.getElementById('launchCount');
    
    // Only clear if showing demo data
    usernameElements.forEach(el => {
      if (el && (el.textContent === 'DemoPlayer' || el.textContent === 'Loading...')) {
        el.textContent = this.currentUser ? (this.currentUser.name || 'Player') : 'Loading...';
      }
    });
    
    // Ensure stats are updated
    if (playTimeElement && this.currentUser) {
      this.updateUserStats();
    }
  }

  showScreen(screenName) {
    // Remove active class from all nav items and screens
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Add active class to current nav item and screen
    const navItem = document.querySelector(`[data-screen="${screenName}"]`);
    const screen = document.getElementById(`${screenName}Screen`);
    
    if (navItem) navItem.classList.add('active');
    if (screen) screen.classList.add('active');
    
    this.currentScreen = screenName;

    // Update Discord RPC
    if (window.electronAPI && window.electronAPI.discord) {
      window.electronAPI.discord.setLauncherActivity(screenName);
    }

    // Load screen-specific data
    switch (screenName) {
      case 'home':
        this.initializeHomeScreen();
        break;
      case 'versions':
        this.initializeVersionsScreen();
        break;
      case 'settings':
        this.initializeSettingsScreen();
        break;
      case 'about':
        this.initializeAboutScreen();
        break;
    }
  }

  async handleLogin() {
    const loginBtn = document.getElementById('loginBtn');
    const statusDiv = document.querySelector('.login-status');
    
    try {
      loginBtn.disabled = true;
      this.updateLoginButton(loginBtn, 'Signing in...', '⏳');
      
      if (statusDiv) {
        statusDiv.textContent = 'Opening Microsoft login...';
        statusDiv.className = 'status-message info';
      }

      const result = await window.electronAPI.auth.login();
      
      if (result.success) {
        this.isLoggedIn = true;
        this.currentUser = result.profile;
        await this.loadUserProfile();
        this.showMainInterface();
        if (statusDiv) statusDiv.textContent = '';
        
        // Update Discord RPC
        await window.electronAPI.discord.setLauncherActivity('home');
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed: ';
      if (error.message.includes('crashed') || error.message.includes('GPU')) {
        errorMessage += 'Browser crashed. Try restarting the launcher or update your graphics drivers.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Login took too long. Please try again.';
      } else if (error.message.includes('cancelled') || error.message.includes('closed')) {
        errorMessage += 'Login was cancelled. Please try again.';
      } else {
        errorMessage += error.message;
      }
      
      if (statusDiv) {
        statusDiv.textContent = errorMessage;
        statusDiv.className = 'status-message error';
      }
      
      loginBtn.disabled = false;
      this.updateLoginButton(loginBtn, 'Sign in with Microsoft', '🔑');
    }
  }

  async handleOfflineMode() {
    const offlineBtn = document.getElementById('offlineBtn');
    const usernameInput = document.getElementById('offlineUsername');
    const statusDiv = document.querySelector('.login-status');
    
    try {
      offlineBtn.disabled = true;
      const username = usernameInput ? usernameInput.value.trim() : null;
      
      if (statusDiv) {
        statusDiv.textContent = 'Setting up offline mode...';
        statusDiv.className = 'status-message info';
      }

      const result = await window.electronAPI.auth.loginOffline(username);
      
      if (result.success) {
        this.isLoggedIn = true;
        this.currentUser = result.profile;
        await this.loadUserProfile();
        this.showMainInterface();
        if (statusDiv) statusDiv.textContent = '';
        
        // Update Discord RPC
        await window.electronAPI.discord.setLauncherActivity('home');
      } else {
        throw new Error(result.error || 'Offline login failed');
      }
    } catch (error) {
      console.error('Offline login error:', error);
      
      if (statusDiv) {
        statusDiv.textContent = 'Offline login failed: ' + error.message;
        statusDiv.className = 'status-message error';
      }
      
      offlineBtn.disabled = false;
    }
  }

  async handleLogout() {
    try {
      await window.electronAPI.auth.logout();
      this.isLoggedIn = false;
      this.currentUser = null;
      this.showLoginInterface();
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification('Logout failed: ' + error.message, 'error');
    }
  }

  async loadUserProfile() {
    try {
      // Always fetch fresh profile data
      this.currentUser = await window.electronAPI.auth.getProfile();
      
      if (this.currentUser) {
        console.log('Loaded user profile:', this.currentUser.name || this.currentUser.username);
        
        // Update user info throughout the UI
        const usernameElements = document.querySelectorAll('#username, .user-name, .profile-name');
        const skinElements = document.querySelectorAll('#skinImage, .user-avatar img');
        const playTimeElement = document.getElementById('playTime');
        const launchCountElement = document.getElementById('launchCount');
        const profileStatusElement = document.querySelector('.profile-status');
        
        usernameElements.forEach(el => {
          if (el) {
            const displayName = this.currentUser.name || this.currentUser.username || 'Player';
            el.textContent = displayName;
          }
        });
        
        skinElements.forEach(el => {
          if (el) {
            if (this.currentUser.skinUrl) {
              el.src = this.currentUser.skinUrl;
              el.style.display = 'block';
            } else {
              // Use default Minecraft skin
              el.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
              el.style.display = 'block';
            }
          }
        });

        // Update play time display
        if (playTimeElement) {
          const playTime = this.currentUser.playTime || 0;
          const hours = Math.floor(playTime / 60);
          const minutes = playTime % 60;
          
          if (hours > 0) {
            playTimeElement.textContent = `${hours}h ${minutes}m`;
          } else {
            playTimeElement.textContent = `${minutes}m`;
          }
        }

        // Update launch count
        if (launchCountElement) {
          launchCountElement.textContent = this.currentUser.launches || 0;
        }

        // Update profile status
        if (profileStatusElement) {
          if (this.currentUser.isOffline) {
            profileStatusElement.textContent = 'Offline Player';
            profileStatusElement.style.color = 'var(--warning)';
          } else {
            profileStatusElement.textContent = 'Minecraft Premium';
            profileStatusElement.style.color = 'var(--success)';
          }
        }

        // Update online indicator
        const onlineIndicator = document.querySelector('.online-indicator');
        if (onlineIndicator) {
          if (this.currentUser.isOffline) {
            onlineIndicator.style.backgroundColor = 'var(--warning)';
            onlineIndicator.title = 'Offline Mode';
          } else {
            onlineIndicator.style.backgroundColor = 'var(--success)';
            onlineIndicator.title = 'Online';
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      const usernameElements = document.querySelectorAll('#username, .user-name, .profile-name');
      usernameElements.forEach(el => {
        if (el) el.textContent = 'Error loading profile';
      });
    }
  }

  async loadVersions() {
    try {
      const manifestData = await window.electronAPI.minecraft.getVersions();
      this.versions = manifestData.versions || [];
      
      this.populateVersionSelects();
      
    } catch (error) {
      console.error('Failed to load versions:', error);
      this.showNotification('Failed to load Minecraft versions', 'error');
    }
  }

  populateVersionSelects() {
    // Update version selects in different screens
    const versionSelects = document.querySelectorAll('.version-select, #versionSelect');
    
    versionSelects.forEach(select => {
      select.innerHTML = '<option value="">Select a version...</option>';
      
      this.versions.forEach(version => {
        const option = document.createElement('option');
        option.value = version.id;
        option.textContent = `${version.id} (${version.type})`;
        option.dataset.type = version.type;
        option.dataset.releaseTime = version.releaseTime;
        select.appendChild(option);
      });
    });
  }

  initializeHomeScreen() {
    // Set up quick launch functionality
    const quickLaunchBtn = document.querySelector('.quick-launch-btn, .launch-btn');
    const versionSelect = document.querySelector('.version-select, #homeVersionSelect');
    
    if (quickLaunchBtn) {
      quickLaunchBtn.addEventListener('click', () => this.handleQuickLaunch());
    }

    // Populate version selector
    if (versionSelect && this.versions.length > 0) {
      versionSelect.innerHTML = '<option value="">Select Minecraft Version...</option>';
      
      // Add latest stable version first
      const latestStable = this.versions.find(v => v.type === 'release');
      if (latestStable) {
        const option = document.createElement('option');
        option.value = latestStable.id;
        option.textContent = `${latestStable.id} (Latest)`;
        option.selected = true;
        versionSelect.appendChild(option);
        this.selectedVersion = latestStable.id;
      }

      // Add other popular versions
      const popularVersions = this.versions
        .filter(v => v.type === 'release')
        .slice(0, 10);
      
      popularVersions.forEach(version => {
        if (version !== latestStable) {
          const option = document.createElement('option');
          option.value = version.id;
          option.textContent = version.id;
          versionSelect.appendChild(option);
        }
      });

      versionSelect.addEventListener('change', (e) => {
        this.selectedVersion = e.target.value;
      });
    }

    // Update user stats display
    this.updateUserStats();
  }

  initializeVersionsScreen() {
    // Set up version management
    this.loadVersions();
    this.setupVersionFilters();
    
    const refreshBtn = document.getElementById('refreshVersionsList');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadVersions());
    }
    
    // Set up search functionality
    const searchInput = document.getElementById('versionSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterVersions());
    }
  }

  setupVersionFilters() {
    const showReleases = document.getElementById('showReleasesFilter');
    const showSnapshots = document.getElementById('showSnapshotsFilter');
    const showBetas = document.getElementById('showBetasFilter');
    
    [showReleases, showSnapshots, showBetas].forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener('change', () => this.filterVersions());
      }
    });
  }

  filterVersions() {
    const showReleases = document.getElementById('showReleasesFilter')?.checked ?? true;
    const showSnapshots = document.getElementById('showSnapshotsFilter')?.checked ?? false;
    const showBetas = document.getElementById('showBetasFilter')?.checked ?? false;
    const searchTerm = document.getElementById('versionSearch')?.value.toLowerCase() || '';
    const versionsList = document.getElementById('versionsList');
    
    if (!versionsList || !this.versions) return;

    versionsList.innerHTML = '';
    
    const filteredVersions = this.versions.filter(version => {
      // Type filter
      if (version.type === 'release' && !showReleases) return false;
      if (version.type === 'snapshot' && !showSnapshots) return false;
      if ((version.type === 'old_beta' || version.type === 'old_alpha') && !showBetas) return false;
      
      // Search filter
      if (searchTerm && !version.id.toLowerCase().includes(searchTerm)) return false;
      
      return true;
    });

    if (filteredVersions.length === 0) {
      versionsList.innerHTML = '<div class="no-versions"><p>No versions found matching your criteria</p></div>';
      return;
    }

    filteredVersions.forEach(version => {
      const versionCard = this.createVersionCard(version);
      versionsList.appendChild(versionCard);
    });
  }

  createVersionCard(version) {
    const card = document.createElement('div');
    card.className = 'version-card';
    
    const typeIcon = {
      'release': '🟢',
      'snapshot': '🟡', 
      'old_beta': '🔵',
      'old_alpha': '🟣'
    }[version.type] || '⚪';
    
    const releaseDate = version.releaseTime ? 
      new Date(version.releaseTime).toLocaleDateString() : 
      'Unknown';
    
    card.innerHTML = `
      <div class="version-header">
        <div class="version-info">
          <h4 class="version-name">${version.id}</h4>
          <span class="version-type">${typeIcon} ${version.type}</span>
        </div>
        <div class="version-actions">
          <button class="download-btn" data-version="${version.id}">
            <span class="btn-icon">📥</span>
            Download
          </button>
          <button class="play-btn" data-version="${version.id}">
            <span class="btn-icon">🚀</span>
            Play
          </button>
        </div>
      </div>
      <div class="version-details">
        <span class="release-date">Released: ${releaseDate}</span>
        <span class="version-size">Size: ~${this.estimateVersionSize(version.type)}</span>
      </div>
    `;
    
    // Add event listeners
    const downloadBtn = card.querySelector('.download-btn');
    const playBtn = card.querySelector('.play-btn');
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.downloadVersion(version.id);
      });
    }
    
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedVersion = version.id;
        this.launchMinecraft();
      });
    }
    
    return card;
  }
  
  estimateVersionSize(type) {
    const sizes = {
      'release': '15-25MB',
      'snapshot': '15-25MB',
      'old_beta': '5-15MB',
      'old_alpha': '1-5MB'
    };
    return sizes[type] || '~20MB';
  }
  
  async downloadVersion(versionId) {
    try {
      this.showProgressIndicator(true, `Downloading ${versionId}...`);
      
      // Update Discord RPC
      if (window.electronAPI?.discord) {
        window.electronAPI.discord.setDownloadActivity(versionId, 0);
      }
      
      await window.electronAPI.downloadMinecraftVersion(versionId);
      
      this.showNotification(`Successfully downloaded ${versionId}`, 'success');
      this.showProgressIndicator(false);
      
      // Update Discord RPC
      if (window.electronAPI?.discord) {
        window.electronAPI.discord.setLauncherActivity('versions');
      }
    } catch (error) {
      console.error('Failed to download version:', error);
      this.showNotification(`Failed to download ${versionId}: ${error.message}`, 'error');
      this.showProgressIndicator(false);
    }
  }
  
  showProgressIndicator(show, message = 'Loading...') {
    const progressIndicator = document.getElementById('progressIndicator');
    const progressText = document.getElementById('progressText');
    
    if (progressIndicator) {
      if (show) {
        progressIndicator.classList.remove('hidden');
        if (progressText) progressText.textContent = message;
      } else {
        progressIndicator.classList.add('hidden');
      }
    }
  }
  
  updateUserStats() {
    // Update user statistics display
    const playTimeEl = document.getElementById('playTime');
    const launchCountEl = document.getElementById('launchCount');
    
    if (this.currentUser) {
      if (playTimeEl) playTimeEl.textContent = this.formatPlayTime(this.currentUser.playTime || 0);
      if (launchCountEl) launchCountEl.textContent = this.currentUser.launchCount || 0;
    }
  }
  
  formatPlayTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  async downloadVersion(versionId) {
    try {
      this.showNotification(`Downloading Minecraft ${versionId}...`, 'info');
      await window.electronAPI.discord.setDownloadActivity(versionId, 0);
      
      const result = await window.electronAPI.minecraft.downloadVersion(versionId);
      
      if (result.success) {
        this.showNotification(`Minecraft ${versionId} downloaded successfully!`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showNotification(`Failed to download ${versionId}: ${error.message}`, 'error');
    }
  }

  async launchVersion(versionId) {
    try {
      const result = await this.launchMinecraft(versionId);
      if (result.success) {
        await window.electronAPI.discord.setGameActivity();
      }
    } catch (error) {
      this.showNotification(`Failed to launch ${versionId}: ${error.message}`, 'error');
    }
  }

  initializeSettingsScreen() {
    // Load current settings
    this.loadSettingsIntoUI();
    this.setupSettingsHandlers();
  }

  setupSettingsHandlers() {
    const saveBtn = document.getElementById('saveSettings');
    const resetBtn = document.getElementById('resetSettings');
    const selectDirBtn = document.getElementById('selectGameDirectory');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }
    
    if (selectDirBtn) {
      selectDirBtn.addEventListener('click', () => this.selectGameDirectory());
    }
  }

  async selectGameDirectory() {
    try {
      const folder = await window.electronAPI.app.selectFolder();
      if (folder) {
        this.settings.gameDirectory = folder;
        const input = document.getElementById('gameDirectoryInput');
        if (input) input.value = folder;
      }
    } catch (error) {
      this.showNotification('Failed to select directory', 'error');
    }
  }

  resetSettings() {
    this.settings = {
      memory: 2048,
      javaArgs: [],
      gameDirectory: null,
      keepLauncherOpen: true,
      showSnapshots: false,
      showBetas: false
    };
    this.loadSettingsIntoUI();
    this.saveSettings();
  }

  initializeAboutScreen() {
    // Load information for the about screen
    this.loadAboutInfo();
    this.setupAboutHandlers();
  }

  setupAboutHandlers() {
    const githubBtn = document.getElementById('openGithub');
    const discordBtn = document.getElementById('openDiscord');
    
    if (githubBtn) {
      githubBtn.addEventListener('click', () => {
        require('electron').shell.openExternal('https://github.com/YNG-CLIENT/YNG-Client');
      });
    }
    
    if (discordBtn) {
      discordBtn.addEventListener('click', () => {
        require('electron').shell.openExternal('https://discord.gg/yngclient');
      });
    }
  }

  updateUserStats() {
    if (!this.currentUser) return;
    
    const playTimeElement = document.getElementById('playTime');
    const launchCountElement = document.getElementById('launchCount');
    const lastPlayedElement = document.getElementById('lastPlayed');
    
    if (playTimeElement) {
      const playTime = this.currentUser.playTime || 0;
      const hours = Math.floor(playTime / 60);
      const minutes = playTime % 60;
      
      if (hours > 0) {
        playTimeElement.textContent = `${hours}h ${minutes}m`;
      } else {
        playTimeElement.textContent = `${minutes}m`;
      }
    }

    if (launchCountElement) {
      launchCountElement.textContent = this.currentUser.launches || 0;
    }

    if (lastPlayedElement) {
      if (this.currentUser.lastPlayed) {
        const lastPlayed = new Date(this.currentUser.lastPlayed);
        lastPlayedElement.textContent = lastPlayed.toLocaleDateString();
      } else {
        lastPlayedElement.textContent = 'Never';
      }
    }
  }

  async handleQuickLaunch() {
    if (!this.selectedVersion) {
      this.showNotification('Please select a Minecraft version first', 'warning');
      return;
    }

    await this.launchMinecraft(this.selectedVersion);
  }

  async launchMinecraft(versionId) {
    if (!this.currentUser) {
      this.showNotification('Please log in first', 'error');
      return { success: false, error: 'Not logged in' };
    }

    try {
      const launchOptions = {
        version: versionId || this.selectedVersion,
        username: this.currentUser.name || 'Player',
        uuid: this.currentUser.id || 'offline-uuid',
        accessToken: this.currentUser.accessToken || 'offline-token',
        gameDirectory: this.settings.gameDirectory || await this.getDefaultGameDirectory(),
        javaArgs: this.settings.javaArgs || [],
        memory: this.settings.memory || 2048,
        isOffline: this.currentUser.isOffline || false
      };

      this.showNotification('Launching Minecraft...', 'info');
      
      const result = await window.electronAPI.minecraft.launch(launchOptions);

      if (result.success) {
        this.showNotification('Minecraft launched successfully!', 'success');
        
        // Update launch count and last played
        if (this.currentUser.isOffline) {
          await window.electronAPI.auth.incrementLaunches();
          this.currentUser.launches = (this.currentUser.launches || 0) + 1;
          this.currentUser.lastPlayed = new Date().toISOString();
          this.updateUserStats();
        }
        
        // Set Discord RPC to game mode
        await window.electronAPI.discord.setGameActivity({
          worldName: 'Minecraft World',
          dimension: 'overworld',
          biome: 'plains'
        });
        
        return { success: true };
      } else {
        throw new Error(result.error || 'Launch failed');
      }
    } catch (error) {
      console.error('Launch error:', error);
      this.showNotification('Failed to launch Minecraft: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('yngclient_settings');
      return saved ? JSON.parse(saved) : {
        memory: 2048,
        javaArgs: [],
        gameDirectory: null,
        keepLauncherOpen: true,
        showSnapshots: false,
        showBetas: false
      };
    } catch {
      return {
        memory: 2048,
        javaArgs: [],
        gameDirectory: null,
        keepLauncherOpen: true,
        showSnapshots: false,
        showBetas: false
      };
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('yngclient_settings', JSON.stringify(this.settings));
      this.showNotification('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  loadSettingsIntoUI() {
    // Load settings into the settings screen UI
    const memorySlider = document.getElementById('memorySlider');
    const memoryValue = document.getElementById('memoryValue');
    const gameDirectory = document.getElementById('gameDirectory');
    const keepLauncherOpen = document.getElementById('keepLauncherOpen');
    const showSnapshots = document.getElementById('showSnapshots');
    const showBetas = document.getElementById('showBetas');

    if (memorySlider && memoryValue) {
      memorySlider.value = this.settings.memory;
      memoryValue.textContent = this.settings.memory + ' MB';
      
      memorySlider.addEventListener('input', (e) => {
        memoryValue.textContent = e.target.value + ' MB';
        this.settings.memory = parseInt(e.target.value);
      });
    }

    if (gameDirectory) {
      gameDirectory.value = this.settings.gameDirectory || '';
    }

    if (keepLauncherOpen) {
      keepLauncherOpen.checked = this.settings.keepLauncherOpen;
    }

    if (showSnapshots) {
      showSnapshots.checked = this.settings.showSnapshots;
    }

    if (showBetas) {
      showBetas.checked = this.settings.showBetas;
    }
  }

  loadAboutInfo() {
    // Load information for the about screen
    const aboutVersion = document.querySelector('.about-version');
    const aboutElectron = document.querySelector('.about-electron');
    const aboutNode = document.querySelector('.about-node');

    if (aboutVersion) {
      window.electronAPI.app.getVersion().then(version => {
        aboutVersion.textContent = version;
      });
    }

    if (aboutElectron) {
      aboutElectron.textContent = process.versions.electron || 'Unknown';
    }

    if (aboutNode) {
      aboutNode.textContent = process.versions.node || 'Unknown';
    }
  }

  updateDownloadProgress(progress) {
    const progressBar = document.querySelector('.download-progress');
    const progressText = document.querySelector('.download-text');
    
    if (progressBar) {
      progressBar.style.width = `${progress.percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${progress.task}: ${progress.percentage}%`;
    }
  }

  showNotification(message, type = 'info') {
    // Create or update notification
    let notification = document.querySelector('.notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }

  async getDefaultGameDirectory() {
    try {
      return await window.electronAPI.minecraft.getDefaultDirectory();
    } catch (error) {
      console.error('Failed to get default directory:', error);
      return null;
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new YNGClientApp();
});