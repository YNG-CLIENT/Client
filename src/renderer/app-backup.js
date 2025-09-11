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
    // Login screen
    document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());

    // Launcher screen
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    document.getElementById('refreshVersions').addEventListener('click', () => this.loadVersions());
    document.getElementById('versionSelect').addEventListener('change', (e) => this.handleVersionSelect(e));
    document.getElementById('showSnapshots').addEventListener('change', () => this.filterVersions());
    document.getElementById('showBetas').addEventListener('change', () => this.filterVersions());
    document.getElementById('selectDirectory').addEventListener('click', () => this.selectGameDirectory());
    document.getElementById('launchBtn').addEventListener('click', () => this.handleLaunch());

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
    document.getElementById('closeSettings').addEventListener('click', () => this.hideSettings());
    document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
    document.getElementById('cancelSettings').addEventListener('click', () => this.hideSettings());

    // Memory slider
    const memorySlider = document.getElementById('memorySlider');
    memorySlider.addEventListener('input', (e) => {
      document.getElementById('memoryValue').textContent = e.target.value;
    });

    // Download progress
    window.electronAPI.minecraft.onDownloadProgress((event, progress) => {
      this.updateDownloadProgress(progress);
    });
  }

  async loadAppVersion() {
    try {
      const version = await window.electronAPI.app.getVersion();
      document.getElementById('appVersion').textContent = `YNG Client v${version}`;
    } catch (error) {
      console.error('Failed to load app version:', error);
    }
  }

  setupAutoUpdater() {
    window.electronAPI.updater.onUpdateAvailable(() => {
      document.getElementById('updateIndicator').classList.remove('hidden');
      this.showStatusMessage('Update available! Downloading...', 'info');
    });

    window.electronAPI.updater.onUpdateDownloaded(() => {
      document.getElementById('updateIndicator').classList.add('hidden');
      this.showStatusMessage('Update downloaded! Restart to apply.', 'success');
    });
  }

  showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('launcherScreen').classList.remove('active');
  }

  showLauncherScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('launcherScreen').classList.add('active');
    this.loadVersions();
    this.setDefaultGameDirectory();
  }

  async handleLogin() {
    const loginBtn = document.getElementById('loginBtn');
    const statusDiv = document.getElementById('loginStatus');
    
    try {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="btn-icon">⏳</span>Signing in...';
      statusDiv.textContent = 'Opening Microsoft login...';
      statusDiv.className = 'status-message info';

      const result = await window.electronAPI.auth.login();
      
      if (result.success) {
        this.isLoggedIn = true;
        await this.loadUserProfile();
        this.showLauncherScreen();
        statusDiv.textContent = '';
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
      
      statusDiv.textContent = errorMessage;
      statusDiv.className = 'status-message error';
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span class="btn-icon">🎮</span>Sign in with Microsoft';
    }
  }

  async handleLogout() {
    try {
      await window.electronAPI.auth.logout();
      this.isLoggedIn = false;
      this.currentUser = null;
      this.showLoginScreen();
    } catch (error) {
      console.error('Logout error:', error);
      this.showStatusMessage('Logout failed: ' + error.message, 'error');
    }
  }

  async loadUserProfile() {
    try {
      this.currentUser = await window.electronAPI.auth.getProfile();
      
      if (this.currentUser) {
        document.getElementById('username').textContent = this.currentUser.name || 'Unknown Player';
        
        // Load user skin
        if (this.currentUser.skinUrl) {
          document.getElementById('skinImage').src = this.currentUser.skinUrl;
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      document.getElementById('username').textContent = 'Error loading profile';
    }
  }

  async loadVersions() {
    const refreshBtn = document.getElementById('refreshVersions');
    const versionSelect = document.getElementById('versionSelect');
    
    try {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳';
      versionSelect.innerHTML = '<option value="">Loading versions...</option>';

      const manifestData = await window.electronAPI.minecraft.getVersions();
      this.versions = manifestData.versions || [];
      
      this.populateVersionSelect();
      this.filterVersions();
      
    } catch (error) {
      console.error('Failed to load versions:', error);
      versionSelect.innerHTML = '<option value="">Failed to load versions</option>';
      this.showStatusMessage('Failed to load Minecraft versions', 'error');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄';
    }
  }

  populateVersionSelect() {
    const versionSelect = document.getElementById('versionSelect');
    versionSelect.innerHTML = '<option value="">Select a version...</option>';
    
    this.versions.forEach(version => {
      const option = document.createElement('option');
      option.value = version.id;
      option.textContent = `${version.id} (${version.type})`;
      option.dataset.type = version.type;
      option.dataset.releaseTime = version.releaseTime;
      versionSelect.appendChild(option);
    });
  }

  filterVersions() {
    const showSnapshots = document.getElementById('showSnapshots').checked;
    const showBetas = document.getElementById('showBetas').checked;
    const versionSelect = document.getElementById('versionSelect');
    
    Array.from(versionSelect.options).forEach(option => {
      if (option.value === '') return; // Skip placeholder option
      
      const type = option.dataset.type;
      let shouldShow = true;
      
      if (type === 'snapshot' && !showSnapshots) {
        shouldShow = false;
      } else if ((type === 'old_beta' || type === 'old_alpha') && !showBetas) {
        shouldShow = false;
      }
      
      option.style.display = shouldShow ? 'block' : 'none';
    });
  }

  handleVersionSelect(event) {
    this.selectedVersion = event.target.value;
    const launchBtn = document.getElementById('launchBtn');
    const launchText = document.getElementById('launchText');
    
    if (this.selectedVersion) {
      launchBtn.disabled = false;
      launchText.textContent = `Play Minecraft ${this.selectedVersion}`;
    } else {
      launchBtn.disabled = true;
      launchText.textContent = 'Select Version to Play';
    }
  }

  async selectGameDirectory() {
    try {
      const selectedPath = await window.electronAPI.app.selectFolder();
      if (selectedPath) {
        document.getElementById('gameDirectory').value = selectedPath;
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      this.showStatusMessage('Failed to select directory', 'error');
    }
  }

  setDefaultGameDirectory() {
    const platform = navigator.platform.toLowerCase();
    let defaultPath = '';
    
    if (platform.includes('win')) {
      defaultPath = '%APPDATA%\\.minecraft';
    } else if (platform.includes('mac')) {
      defaultPath = '~/Library/Application Support/minecraft';
    } else {
      defaultPath = '~/.minecraft';
    }
    
    document.getElementById('gameDirectory').value = defaultPath;
  }

  async handleLaunch() {
    if (!this.selectedVersion) {
      this.showStatusMessage('Please select a Minecraft version', 'error');
      return;
    }

    const launchBtn = document.getElementById('launchBtn');
    const progressContainer = document.getElementById('downloadProgress');
    
    try {
      launchBtn.disabled = true;
      launchBtn.innerHTML = '<span class="btn-icon">⏳</span>Preparing...';
      
      this.showStatusMessage('Checking version files...', 'info');
      
      // Download version if needed
      progressContainer.classList.remove('hidden');
      await window.electronAPI.minecraft.downloadVersion(this.selectedVersion);
      
      // Launch the game
      this.showStatusMessage('Starting Minecraft...', 'info');
      launchBtn.innerHTML = '<span class="btn-icon">🚀</span>Launching...';
      
      const launchOptions = {
        version: this.selectedVersion,
        gameDirectory: document.getElementById('gameDirectory').value,
        memory: document.getElementById('memorySlider').value,
        user: this.currentUser
      };
      
      const result = await window.electronAPI.minecraft.launch(launchOptions);
      
      if (result.success) {
        this.showStatusMessage('Minecraft launched successfully!', 'success');
        if (this.settings.closeAfterLaunch) {
          setTimeout(() => window.close(), 2000);
        }
      } else {
        throw new Error(result.error || 'Launch failed');
      }
      
    } catch (error) {
      console.error('Launch error:', error);
      this.showStatusMessage('Launch failed: ' + error.message, 'error');
    } finally {
      launchBtn.disabled = false;
      launchBtn.innerHTML = `<span class="btn-icon">🚀</span>Play Minecraft ${this.selectedVersion}`;
      progressContainer.classList.add('hidden');
    }
  }

  updateDownloadProgress(progress) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progress.percentage !== undefined) {
      progressFill.style.width = `${progress.percentage}%`;
    }
    
    if (progress.message) {
      progressText.textContent = progress.message;
    }
  }

  showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('launchStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status-message';
      }, 3000);
    }
  }

  showSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');
    
    // Load current settings
    document.getElementById('autoUpdate').checked = this.settings.autoUpdate;
    document.getElementById('closeAfterLaunch').checked = this.settings.closeAfterLaunch;
    document.getElementById('enableConsole').checked = this.settings.enableConsole;
  }

  hideSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
  }

  saveSettings() {
    this.settings = {
      autoUpdate: document.getElementById('autoUpdate').checked,
      closeAfterLaunch: document.getElementById('closeAfterLaunch').checked,
      enableConsole: document.getElementById('enableConsole').checked
    };
    
    localStorage.setItem('yngClientSettings', JSON.stringify(this.settings));
    this.hideSettings();
    this.showStatusMessage('Settings saved successfully', 'success');
  }

  loadSettings() {
    const defaultSettings = {
      autoUpdate: true,
      closeAfterLaunch: false,
      enableConsole: false
    };
    
    try {
      const saved = localStorage.getItem('yngClientSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return defaultSettings;
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new YNGClientApp();
});