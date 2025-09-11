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
    this.isLoggedIn = await window.electronAPI.auth.isLoggedIn();
    if (this.isLoggedIn) {
      await this.loadUserProfile();
      this.showMainInterface();
    } else {
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
    // Show sidebar and main content, hide login
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const loginContainer = document.querySelector('.login-container');
    
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'flex';
    if (loginContainer) loginContainer.style.display = 'none';
    
    // Show home screen by default
    this.showScreen('home');
    this.loadVersions();
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
        await this.loadUserProfile();
        this.showMainInterface();
        if (statusDiv) statusDiv.textContent = '';
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

  updateLoginButton(button, text, icon) {
    const btnContent = button.querySelector('.btn-content');
    if (btnContent) {
      const btnIcon = btnContent.querySelector('.btn-icon');
      const btnTitle = btnContent.querySelector('.btn-title');
      
      if (btnIcon) btnIcon.textContent = icon;
      if (btnTitle) btnTitle.textContent = text;
    } else {
      button.textContent = text;
    }
  }

  async handleOfflineMode() {
    this.isLoggedIn = false;
    this.currentUser = {
      name: 'Player',
      uuid: 'offline-uuid',
      skinUrl: null
    };
    
    await this.loadUserProfile();
    this.showMainInterface();
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
      if (this.isLoggedIn) {
        this.currentUser = await window.electronAPI.auth.getProfile();
      }
      
      if (this.currentUser) {
        // Update user info in sidebar if it exists
        const usernameElement = document.querySelector('.user-name');
        const skinElement = document.querySelector('.user-avatar');
        
        if (usernameElement) {
          usernameElement.textContent = this.currentUser.name || 'Unknown Player';
        }
        
        if (skinElement && this.currentUser.skinUrl) {
          skinElement.src = this.currentUser.skinUrl;
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      const usernameElement = document.querySelector('.user-name');
      if (usernameElement) {
        usernameElement.textContent = 'Error loading profile';
      }
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
    const quickLaunchBtn = document.querySelector('.quick-launch-btn');
    if (quickLaunchBtn) {
      quickLaunchBtn.addEventListener('click', () => this.handleQuickLaunch());
    }
  }

  initializeVersionsScreen() {
    // Set up version management
    this.loadVersions();
  }

  initializeSettingsScreen() {
    // Load current settings
    this.loadSettingsIntoUI();
  }

  initializeAboutScreen() {
    // Set up about page info
    this.loadAboutInfo();
  }

  async handleQuickLaunch() {
    if (!this.selectedVersion) {
      this.showNotification('Please select a Minecraft version first', 'warning');
      return;
    }

    try {
      const result = await window.electronAPI.minecraft.launch({
        version: this.selectedVersion,
        username: this.currentUser?.name || 'Player',
        uuid: this.currentUser?.uuid || 'offline-uuid',
        accessToken: this.currentUser?.accessToken,
        gameDirectory: this.settings.gameDirectory || await this.getDefaultGameDirectory(),
        javaArgs: this.settings.javaArgs || [],
        memory: this.settings.memory || 2048
      });

      if (result.success) {
        this.showNotification('Minecraft launched successfully!', 'success');
      } else {
        throw new Error(result.error || 'Launch failed');
      }
    } catch (error) {
      console.error('Launch error:', error);
      this.showNotification('Failed to launch Minecraft: ' + error.message, 'error');
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