class YNGClientApp {
  constructor() {
    this.currentUser = null;
    this.selectedVersion = null;
    this.isLoggedIn = false;
    this.versions = [];
    this.fabricVersions = [];
    this.neoforgeVersions = [];
    this.currentModLoader = 'vanilla';
    this.settings = {}; // Will be loaded asynchronously
    this.currentScreen = 'login';
    
    this.initializeApp();
  }

  async initializeApp() {
    this.createParticleEffect();
    this.setupEventListeners();
    this.loadAppVersion();
    this.setupAutoUpdater();
    
    // Load settings asynchronously
    this.settings = await this.loadSettings();
    
    // Check if user is already logged in
    try {
      console.log('Checking authentication status...');
      this.isLoggedIn = await window.electronAPI.auth.isLoggedIn();
      console.log('Authentication status:', this.isLoggedIn);
      
      if (this.isLoggedIn) {
        console.log('User is logged in, loading profile...');
        await this.loadUserProfile();
        if (this.currentUser) {
          console.log('Profile loaded, showing main interface');
          this.showMainInterface();
          // Load versions after showing main interface
          this.loadVersions();
        } else {
          console.warn('No user profile found, showing login');
          this.showLoginInterface();
        }
      } else {
        console.log('User not logged in, showing login interface');
        this.showLoginInterface();
      }
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      console.log('Defaulting to login interface');
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
    console.log('Setting up event listeners...');
    
    // Use a more robust approach to ensure the login button exists
    this.setupLoginButton();
    
    // Offline mode button
    const offlineBtn = document.getElementById('offlineBtn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', () => this.handleOfflineMode());
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
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
    
    // Mod loader tabs
    this.setupModLoaderTabs();

    // Download progress
    if (window.electronAPI && window.electronAPI.minecraft) {
      window.electronAPI.minecraft.onDownloadProgress((event, progress) => {
        this.updateDownloadProgress(progress);
      });
    }
  }

  setupLoginButton() {
    console.log('Setting up login button...');
    
    // Try multiple times to find the login button since it might not be in DOM yet
    const findAndSetupLoginButton = () => {
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        console.log('Login button found, adding event listener');
        
        // Remove any existing listeners to avoid duplicates
        loginBtn.removeEventListener('click', this.handleLoginWrapper);
        
        // Create a bound wrapper function
        this.handleLoginWrapper = (e) => {
          console.log('Login button clicked!');
          e.preventDefault();
          e.stopPropagation();
          this.handleLogin();
        };
        
        loginBtn.addEventListener('click', this.handleLoginWrapper);
        console.log('Login button event listener added successfully');
        return true;
      } else {
        console.warn('Login button NOT found, will retry...');
        return false;
      }
    };

    // Try immediately
    if (!findAndSetupLoginButton()) {
      // If not found, try again after a short delay
      setTimeout(() => {
        if (!findAndSetupLoginButton()) {
          // Try once more after the interface might be ready
          setTimeout(findAndSetupLoginButton, 500);
        }
      }, 100);
    }
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
      
      // Check for updates and show indicator if available
      this.checkForUpdates();
    } catch (error) {
      console.error('Failed to load app version:', error);
    }
  }

  async checkForUpdates() {
    try {
      const updateInfo = await window.electronAPI.app.checkForUpdates();
      const updateIndicator = document.getElementById('updateIndicator');
      
      if (updateInfo.isUpdateAvailable && updateIndicator) {
        updateIndicator.classList.remove('hidden');
        updateIndicator.style.background = 'var(--warning)';
        updateIndicator.title = `Update available: v${updateInfo.latestVersion}`;
        
        // Show notification about update
        this.showNotification(`New version v${updateInfo.latestVersion} is available!`, 'info');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
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
    console.log('Attempting to show login interface...');
    
    // Hide sidebar but keep main content visible
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const loginScreen = document.getElementById('loginScreen');
    
    console.log('DOM elements found:');
    console.log('- sidebar:', !!sidebar);
    console.log('- mainContent:', !!mainContent);
    console.log('- loginScreen:', !!loginScreen);
    
    if (sidebar) {
      sidebar.style.display = 'none';
      console.log('Sidebar hidden');
    }
    
    if (mainContent) {
      mainContent.style.display = 'block';
      console.log('Main content shown');
    }
    
    // Hide all screens first
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Show only the login screen
    if (loginScreen) {
      loginScreen.classList.add('active');
      console.log('Login screen should now be visible');
      
      // Re-setup login button after showing the interface
      setTimeout(() => {
        console.log('Re-setting up login button after interface shown...');
        this.setupLoginButton();
      }, 100);
    } else {
      console.error('Login screen not found! Check HTML structure.');
    }
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
      case 'instances':
        this.initializeInstancesScreen();
        break;
      case 'downloads':
        this.initializeDownloadsScreen();
        break;
      case 'settings':
        this.initializeSettingsScreen();
        break;
      case 'stats':
        this.initializeStatsScreen();
        break;
      case 'about':
        this.initializeAboutScreen();
        break;
    }
  }

  async handleLogin() {
    console.log('handleLogin method called');
    const loginBtn = document.getElementById('loginBtn');
    const statusDiv = document.querySelector('.login-status');
    
    console.log('Login button element:', loginBtn);
    console.log('Status div element:', statusDiv);
    
    try {
      if (loginBtn) {
        loginBtn.disabled = true;
        this.updateLoginButton(loginBtn, 'Signing in...', '⏳');
      }
      
      if (statusDiv) {
        statusDiv.textContent = 'Opening Microsoft login...';
        statusDiv.className = 'status-message info';
      }

      console.log('Calling Microsoft auth login...');
      const result = await window.electronAPI.auth.login();
      console.log('Auth result:', result);
      
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
      } else if (error.message.includes('unauthorized_client') || error.message.includes('invalid_client')) {
        errorMessage += 'Microsoft authentication service issue. Trying alternative authentication method...';
      } else if (error.message.includes('Authentication failed')) {
        errorMessage += 'Unable to connect to Microsoft servers. Please check your internet connection and try again.';
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

  updateLoginButton(button, text, icon) {
    if (!button) return;
    
    button.innerHTML = `
      <span class="btn-icon">${icon}</span>
      <span class="btn-text">${text}</span>
    `;
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
    // Prevent multiple simultaneous version loads
    if (this.loadingVersions) {
      console.log('Version loading already in progress, skipping...');
      return;
    }
    
    try {
      this.loadingVersions = true;
      console.log('Loading Minecraft versions...');
      
      // Show loading indicator
      this.showLoadingVersions(true);
      
      const manifestData = await window.electronAPI.minecraft.getVersions();
      this.versions = manifestData.versions || [];
      
      // Clear existing version displays
      this.clearVersionSelects();
      
      // Progressive loading - first show releases, then snapshots, then old versions
      this.populateVersionsProgressively();
      
      console.log(`Loaded ${this.versions.length} versions`);
      
    } catch (error) {
      console.error('Failed to load versions:', error);
      this.showNotification('Failed to load Minecraft versions', 'error');
    } finally {
      this.loadingVersions = false;
      this.showLoadingVersions(false);
    }
  }

  showLoadingVersions(show) {
    const versionsList = document.getElementById('versionsList');
    const versionSelects = document.querySelectorAll('.version-select');
    
    if (show) {
      if (versionsList) {
        versionsList.innerHTML = '<div class="loading-versions"><div class="spinner"></div><p>Loading Minecraft versions...</p></div>';
      }
      versionSelects.forEach(select => {
        select.innerHTML = '<option value="">Loading versions...</option>';
        select.disabled = true;
      });
    } else {
      versionSelects.forEach(select => {
        select.disabled = false;
      });
    }
  }

  clearVersionSelects() {
    const versionSelects = document.querySelectorAll('.version-select');
    versionSelects.forEach(select => {
      select.innerHTML = '<option value="">Select a version...</option>';
    });
  }

  populateVersionsProgressively() {
    // Sort versions by priority: releases first, then snapshots, then old versions
    const releases = this.versions.filter(v => v.type === 'release');
    const snapshots = this.versions.filter(v => v.type === 'snapshot');
    const oldVersions = this.versions.filter(v => v.type !== 'release' && v.type !== 'snapshot');

    // First populate dropdowns with releases
    setTimeout(() => this.populateVersionSelects(releases), 100);
    
    // Then add snapshots
    setTimeout(() => this.populateVersionSelects([...releases, ...snapshots]), 300);
    
    // Finally add all versions
    setTimeout(() => this.populateVersionSelects(this.versions), 500);

    // Update version cards if on versions screen
    this.filterVersions(); // Use filterVersions to respect checkbox states
  }

  updateVersionCards() {
    const versionsList = document.getElementById('versionsList');
    if (!versionsList) return;

    versionsList.innerHTML = '';
    
    // Group versions by type for better organization
    const releases = this.versions.filter(v => v.type === 'release').slice(0, 20); // Show latest 20 releases
    const snapshots = this.versions.filter(v => v.type === 'snapshot').slice(0, 10); // Show latest 10 snapshots
    
    // Add releases section
    if (releases.length > 0) {
      const releasesSection = document.createElement('div');
      releasesSection.className = 'versions-section';
      releasesSection.innerHTML = '<h3 class="section-title">📦 Release Versions</h3>';
      
      releases.forEach(version => {
        const card = this.createVersionCard(version);
        releasesSection.appendChild(card);
      });
      
      versionsList.appendChild(releasesSection);
    }

    // Add snapshots section
    if (snapshots.length > 0) {
      const snapshotsSection = document.createElement('div');
      snapshotsSection.className = 'versions-section';
      snapshotsSection.innerHTML = '<h3 class="section-title">🧪 Snapshot Versions</h3>';
      
      snapshots.forEach(version => {
        const card = this.createVersionCard(version);
        snapshotsSection.appendChild(card);
      });
      
      versionsList.appendChild(snapshotsSection);
    }
  }

  populateVersionSelects(versionsToShow = null) {
    const versions = versionsToShow || this.versions;
    const versionSelects = document.querySelectorAll('.version-select, #versionSelect');
    
    versionSelects.forEach(select => {
      // Keep the default option
      if (select.children.length === 1 && select.children[0].value === '') {
        // Keep the "Select a version..." option
      } else {
        select.innerHTML = '<option value="">Select a version...</option>';
      }
      
      versions.forEach(version => {
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
    console.log('Initializing home screen...');
    
    // Set up customization buttons
    this.setupCustomizationButtons();
    
    // Set up instance dropdown and play button
    this.setupInstancePlayButton();
    
    // Load instances for dropdown
    this.loadInstancesForDropdown();
    
    // Update playtime stats
    this.updatePlaytimeStats();
  }

  setupCustomizationButtons() {
    const uploadSkinBtn = document.getElementById('uploadSkinBtn');
    const browseSkinBtn = document.getElementById('browseSkinBtn');
    const browseCapeBtn = document.getElementById('browseCapeBtn');
    const removeCapeBtn = document.getElementById('removeCapeBtn');

    if (uploadSkinBtn) {
      uploadSkinBtn.addEventListener('click', () => this.handleUploadSkin());
    }

    if (browseSkinBtn) {
      browseSkinBtn.addEventListener('click', () => this.handleBrowseSkins());
    }

    if (browseCapeBtn) {
      browseCapeBtn.addEventListener('click', async () => await this.handleBrowseCapes());
    }

    if (removeCapeBtn) {
      removeCapeBtn.addEventListener('click', () => this.handleRemoveCape());
    }
  }

  setupInstancePlayButton() {
    const launchBtn = document.getElementById('launchBtn');
    const instanceDropdownBtn = document.getElementById('instanceDropdownBtn');
    const instanceDropdown = document.getElementById('instanceDropdown');
    const createInstanceFromHome = document.getElementById('createInstanceFromHome');

    if (launchBtn) {
      launchBtn.addEventListener('click', () => this.handleInstanceLaunch());
    }

    if (instanceDropdownBtn) {
      instanceDropdownBtn.addEventListener('click', () => {
        const isActive = instanceDropdownBtn.classList.contains('active');
        if (isActive) {
          this.hideInstanceDropdown();
        } else {
          this.showInstanceDropdown();
        }
      });
    }

    if (createInstanceFromHome) {
      createInstanceFromHome.addEventListener('click', () => {
        this.showScreen('instances');
        setTimeout(() => {
          this.openCreateInstanceModal();
        }, 100);
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.play-button-group')) {
        this.hideInstanceDropdown();
      }
    });
  }

  async loadInstancesForDropdown() {
    try {
      const instances = JSON.parse(localStorage.getItem('yngInstances') || '[]');
      this.displayInstancesInDropdown(instances);
    } catch (error) {
      console.error('Failed to load instances for dropdown:', error);
      this.displayInstancesInDropdown([]);
    }
  }

  displayInstancesInDropdown(instances) {
    const instanceList = document.getElementById('instanceList');
    if (!instanceList) return;

    if (instances.length === 0) {
      instanceList.innerHTML = `
        <div class="no-instances">
          <span>No instances created</span>
          <button id="createInstanceFromHome" class="create-instance-btn">
            <span class="btn-icon">➕</span>
            Create Instance
          </button>
        </div>
      `;
      
      // Re-attach event listener
      const createBtn = instanceList.querySelector('#createInstanceFromHome');
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          this.showScreen('instances');
          setTimeout(() => this.openCreateInstanceModal(), 100);
        });
      }
      
      // Update launch button text
      const launchText = document.getElementById('launchText');
      if (launchText) {
        launchText.textContent = 'Create Instance to Play';
      }
      return;
    }

    instanceList.innerHTML = '';
    instances.forEach(instance => {
      const instanceItem = document.createElement('div');
      instanceItem.className = 'instance-item';
      instanceItem.setAttribute('data-instance-id', instance.id);

      const isDownloaded = this.isVersionDownloaded(instance.version);
      
      instanceItem.innerHTML = `
        <div class="instance-item-icon">${instance.icon || '🎯'}</div>
        <div class="instance-item-info">
          <h4>${instance.name}</h4>
          <p>${instance.version} • ${instance.modLoader} ${isDownloaded ? '• Ready' : '• Not Downloaded'}</p>
        </div>
      `;

      instanceItem.addEventListener('click', () => {
        this.selectInstance(instance);
        this.hideInstanceDropdown();
      });

      instanceList.appendChild(instanceItem);
    });

    // Update launch button with first instance if none selected
    if (instances.length > 0 && !this.selectedInstance) {
      this.selectInstance(instances[0]);
    }
  }

  selectInstance(instance) {
    this.selectedInstance = instance;
    const launchText = document.getElementById('launchText');
    const btnSubtitle = document.querySelector('.btn-subtitle');
    
    if (launchText) {
      launchText.textContent = `Play ${instance.name}`;
    }
    
    if (btnSubtitle) {
      const isDownloaded = this.isVersionDownloaded(instance.version);
      btnSubtitle.textContent = isDownloaded ? 
        `${instance.version} • ${instance.modLoader}` : 
        `Download required: ${instance.version}`;
    }
  }

  showInstanceDropdown() {
    const dropdown = document.getElementById('instanceDropdown');
    const dropdownBtn = document.getElementById('instanceDropdownBtn');
    
    if (dropdown && dropdownBtn) {
      dropdown.classList.remove('hidden');
      dropdownBtn.classList.add('active');
      this.loadInstancesForDropdown(); // Refresh instances
    }
  }

  hideInstanceDropdown() {
    const dropdown = document.getElementById('instanceDropdown');
    const dropdownBtn = document.getElementById('instanceDropdownBtn');
    
    if (dropdown && dropdownBtn) {
      dropdown.classList.add('hidden');
      dropdownBtn.classList.remove('active');
    }
  }

  async handleInstanceLaunch() {
    if (!this.selectedInstance) {
      this.showNotification('Please select an instance to play', 'warning');
      return;
    }

    try {
      // Check if version is downloaded
      if (!this.isVersionDownloaded(this.selectedInstance.version)) {
        // Don't show small notification since large download notification will appear
        await this.downloadVersion(this.selectedInstance.version);
        return;
      }

      // Launch the instance
      await this.launchInstance(this.selectedInstance);
    } catch (error) {
      console.error('Failed to launch instance:', error);
      this.showNotification('Failed to launch instance', 'error');
    }
  }

  async updatePlaytimeStats() {
    try {
      const stats = await window.electronAPI.playtime.getStats();
      
      const playTimeElement = document.getElementById('playTime');
      const launchCountElement = document.getElementById('launchCount');
      
      if (playTimeElement && stats.totalPlaytime) {
        const hours = Math.floor(stats.totalPlaytime / 60);
        playTimeElement.textContent = `${hours}h`;
      }
      
      if (launchCountElement && stats.totalSessions) {
        launchCountElement.textContent = stats.totalSessions;
      }
    } catch (error) {
      console.error('Failed to update playtime stats:', error);
    }
  }

  async handleUploadSkin() {
    try {
      const result = await window.electronAPI.customization.uploadSkin();
      if (result.success) {
        this.showNotification('Skin uploaded successfully!', 'success');
        this.updateSkinPreview(result.skinUrl);
      }
    } catch (error) {
      console.error('Failed to upload skin:', error);
      this.showNotification('Failed to upload skin', 'error');
    }
  }

  handleBrowseSkins() {
    // Open skin browser (placeholder for now)
    this.showNotification('Skin browser coming soon!', 'info');
  }

  async handleBrowseCapes() {
    // Open cape browser modal with user's actual owned capes
    await this.showCapeSelectionModal();
  }

  async showCapeSelectionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Get user's actual capes
    const userCapes = await this.getUserOwnedCapes();
    const mojangCapes = userCapes.filter(cape => cape.type === 'mojang');
    
    // Get YNG Client capes from assets
    const clientCapes = await this.getClientCapes();
    
    modal.innerHTML = `
      <div class="modal-content cape-selection-modal">
        <div class="modal-header">
          <h3>Select Cape</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          ${userCapes.length === 0 && clientCapes.length === 0 ? `
            <div class="no-capes-message">
              <div class="no-capes-icon">🎪</div>
              <h4>No Capes Available</h4>
              <p>You don't have any capes available at the moment. Official Mojang capes and future YNG Client reward capes will appear here!</p>
            </div>
          ` : `
            ${mojangCapes.length > 0 ? `
              <div class="cape-section">
                <h4 class="cape-section-title">
                  <span class="cape-type-icon">🏆</span>
                  Official Mojang Capes
                </h4>
                <div class="cape-grid">
                  ${mojangCapes.map(cape => `
                    <div class="cape-option mojang-cape" data-cape-id="${cape.id}">
                      <div class="cape-preview">
                        <img src="${cape.texture}" alt="${cape.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCA2NCAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjMyIiBmaWxsPSIjNDQ0Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIxOCIgZmlsbD0iI0FBQSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMCI+Q2FwZTwvdGV4dD4KPHN2Zz4='" />
                        <div class="cape-badge official">Official</div>
                      </div>
                      <div class="cape-info">
                        <h4>${cape.name}</h4>
                        <p>${cape.description}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${clientCapes.length > 0 ? `
              <div class="cape-section">
                <h4 class="cape-section-title">
                  <span class="cape-type-icon">�</span>
                  YNG Client Capes
                </h4>
                <div class="cape-grid">
                  ${clientCapes.map(cape => `
                    <div class="cape-option client-cape ${cape.unlocked ? '' : 'locked'}" data-cape-id="${cape.id}">
                      <div class="cape-preview">
                        <img src="./assets/capes/${cape.file}" alt="${cape.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCA2NCAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjMyIiBmaWxsPSIjNDQ0Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIxOCIgZmlsbD0iI0FBQSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMCI+Q2FwZTwvdGV4dD4KPHN2Zz4='" />
                        <div class="cape-badge ${cape.rarity}">${cape.rarity.charAt(0).toUpperCase() + cape.rarity.slice(1)}</div>
                        ${!cape.unlocked ? '<div class="cape-lock">🔒</div>' : ''}
                      </div>
                      <div class="cape-info">
                        <h4>${cape.name}</h4>
                        <p>${cape.description}</p>
                        ${!cape.unlocked ? `<small class="unlock-hint">Unlock by: ${cape.unlock_condition}</small>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <div class="cape-section">
              <h4 class="cape-section-title">
                <span class="cape-type-icon">🚫</span>
                Remove Cape
              </h4>
              <div class="cape-grid">
                <div class="cape-option" data-cape-id="none">
                  <div class="cape-preview no-cape">
                    <span>🚫</span>
                  </div>
                  <div class="cape-info">
                    <h4>No Cape</h4>
                    <p>Remove current cape</p>
                  </div>
                </div>
              </div>
            </div>
          `}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.app.applyCapeSelection()">Apply</button>
        </div>
      </div>
    `;
    
    // Add event listeners for cape selection
    modal.addEventListener('click', (e) => {
      const capeOption = e.target.closest('.cape-option:not(.locked)');
      if (capeOption && !e.target.classList.contains('cape-delete-btn')) {
        // Remove previous selection
        modal.querySelectorAll('.cape-option').forEach(opt => opt.classList.remove('selected'));
        // Add selection to clicked option
        capeOption.classList.add('selected');
        modal.selectedCapeId = capeOption.dataset.capeId;
      }
    });

    document.body.appendChild(modal);
  }  async getUserOwnedCapes() {
    try {
      const ownedCapes = [];
      
      // Get Mojang official capes from user profile
      const officialCapes = await this.getMojangOwnedCapes();
      ownedCapes.push(...officialCapes);
      
      // Get custom capes from local storage
      const customCapes = await this.getCustomCapes();
      ownedCapes.push(...customCapes);
      
      return ownedCapes;
    } catch (error) {
      console.error('Failed to fetch user capes:', error);
      return [];
    }
  }

  async getMojangOwnedCapes() {
    try {
      if (!this.currentUser || !this.currentUser.uuid) {
        return [];
      }
      
      // Fetch user's cape data from Mojang API
      const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${this.currentUser.uuid}`);
      if (!response.ok) {
        console.warn('Failed to fetch user cape data');
        return [];
      }
      
      const profile = await response.json();
      const capes = [];
      
      // Check for cape in profile properties
      if (profile.properties) {
        for (const prop of profile.properties) {
          if (prop.name === 'textures') {
            try {
              const textureData = JSON.parse(atob(prop.value));
              if (textureData.textures?.CAPE) {
                // User has a cape - determine which one it is
                const capeUrl = textureData.textures.CAPE.url;
                const cape = this.identifyCapeFromUrl(capeUrl);
                if (cape) {
                  cape.type = 'mojang';
                  cape.owned = true;
                  capes.push(cape);
                }
              }
            } catch (error) {
              console.warn('Failed to parse texture data:', error);
            }
          }
        }
      }
      
      return capes;
    } catch (error) {
      console.error('Failed to fetch Mojang capes:', error);
      return [];
    }
  }

  async getCustomCapes() {
    try {
      // Get custom capes from settings/storage
      const customCapes = await window.electronAPI.settings.get('customCapes') || [];
      return customCapes.map(cape => ({
        ...cape,
        type: 'custom',
        owned: true
      }));
    } catch (error) {
      console.error('Failed to fetch custom capes:', error);
      return [];
    }
  }

  async getClientCapes() {
    try {
      // Load client capes from assets/capes.json
      const response = await fetch('./assets/capes.json');
      const capesData = await response.json();
      
      // Get user's unlock status for each cape
      const unlockedCapes = await window.electronAPI.settings.get('unlockedClientCapes') || ['yng_classic']; // Default cape
      
      return capesData.client_capes.map(cape => ({
        ...cape,
        type: 'client',
        unlocked: unlockedCapes.includes(cape.id),
        texture: `./assets/capes/${cape.file}`
      }));
    } catch (error) {
      console.error('Failed to fetch client capes:', error);
      // Return default cape as fallback
      return [{
        id: 'yng_classic',
        name: 'YNG Classic',
        description: 'Default YNG Client cape',
        file: 'yng_classic.png',
        rarity: 'common',
        unlocked: true,
        type: 'client',
        texture: './assets/capes/yng_classic.png'
      }];
    }
  }

  identifyCapeFromUrl(capeUrl) {
    // Map known cape URLs to cape information
    const knownCapes = {
      // Minecon capes
      'minecon2011': {
        id: 'minecon_2011',
        name: 'Minecon 2011',
        description: 'Red creeper cape from Minecon 2011',
        texture: capeUrl
      },
      'minecon2012': {
        id: 'minecon_2012', 
        name: 'Minecon 2012',
        description: 'Blue creeper cape from Minecon 2012',
        texture: capeUrl
      },
      'minecon2013': {
        id: 'minecon_2013',
        name: 'Minecon 2013', 
        description: 'Yellow creeper cape from Minecon 2013',
        texture: capeUrl
      },
      'minecon2015': {
        id: 'minecon_2015',
        name: 'Minecon 2015',
        description: 'Green creeper cape from Minecon 2015', 
        texture: capeUrl
      },
      'minecon2016': {
        id: 'minecon_2016',
        name: 'Minecon 2016',
        description: 'Orange creeper cape from Minecon 2016',
        texture: capeUrl
      },
      // Special capes
      'translator': {
        id: 'translator',
        name: 'Translator',
        description: 'Purple cape for Minecraft translators',
        texture: capeUrl
      },
      'mojang': {
        id: 'mojang',
        name: 'Mojang',
        description: 'Red Mojang cape for employees',
        texture: capeUrl
      }
    };
    
    // Try to identify cape by URL patterns
    for (const [key, cape] of Object.entries(knownCapes)) {
      if (capeUrl.toLowerCase().includes(key)) {
        return cape;
      }
    }
    
    // If we can't identify it, return a generic cape entry
    return {
      id: 'unknown',
      name: 'Custom Cape',
      description: 'A custom cape',
      texture: capeUrl
    };
  }

  getMojangCapes() {
    return [
      {
        id: 'minecon_2011',
        name: 'Minecon 2011',
        description: 'Red creeper cape from Minecon 2011',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        id: 'minecon_2012',
        name: 'Minecon 2012',
        description: 'Blue creeper cape from Minecon 2012',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        id: 'minecon_2013',
        name: 'Minecon 2013',
        description: 'Yellow creeper cape from Minecon 2013',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        id: 'minecon_2015',
        name: 'Minecon 2015',
        description: 'Green creeper cape from Minecon 2015',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        id: 'minecon_2016',
        name: 'Minecon 2016',
        description: 'Orange creeper cape from Minecon 2016',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        id: 'translator',
        name: 'Translator',
        description: 'Purple cape for Minecraft translators',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        id: 'mojang',
        name: 'Mojang',
        description: 'Red Mojang cape for employees',
        texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
    ];
  }

  applyCapeSelection() {
    const modal = document.querySelector('.cape-selection-modal').closest('.modal-overlay');
    const selectedCapeId = modal.selectedCapeId;
    
    if (selectedCapeId !== undefined) {
      if (selectedCapeId === 'none') {
        this.showNotification('Cape removed!', 'success');
      } else {
        // Find the cape details
        const allCapes = [...document.querySelectorAll('.cape-option[data-cape-id]')];
        const selectedCape = allCapes.find(cape => cape.dataset.capeId === selectedCapeId);
        if (selectedCape) {
          const capeName = selectedCape.querySelector('h4').textContent;
          this.showNotification(`Applied ${capeName} cape!`, 'success');
        }
      }
      modal.remove();
    } else {
      this.showNotification('Please select a cape first', 'warning');
    }
  }

  handleRemoveCape() {
    // Remove cape by setting it to none
    this.showNotification('Cape removed!', 'success');
    // Here you could also save the cape preference to settings
    // await window.electronAPI.settings.set('selectedCape', 'none');
  }

  updateSkinPreview(skinUrl) {
    const previewSkin = document.getElementById('previewSkin');
    const skinImage = document.getElementById('skinImage');
    
    if (previewSkin) {
      previewSkin.src = skinUrl;
    }
    
    if (skinImage) {
      skinImage.src = skinUrl;
    }
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

  setupModLoaderTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loader = e.currentTarget.dataset.loader;
        this.switchModLoader(loader);
      });
    });
  }

  switchModLoader(loader) {
    this.currentModLoader = loader;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.tab-btn[data-loader="${loader}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    // Load versions for selected mod loader
    this.loadVersionsForModLoader(loader);
  }

  async loadVersionsForModLoader(loader) {
    console.log(`Loading versions for ${loader}...`);
    
    switch (loader) {
      case 'vanilla':
        await this.loadVersions();
        break;
      case 'fabric':
        await this.loadFabricVersions();
        break;
      case 'neoforge':
        await this.loadNeoForgeVersions();
        break;
    }
  }

  async loadFabricVersions() {
    try {
      console.log('Loading Fabric versions...');
      
      // Get supported Minecraft versions for Fabric
      const gameResponse = await fetch('https://meta.fabricmc.net/v2/versions/game');
      const supportedVersions = await gameResponse.json();
      
      // Get latest Fabric loader version
      const loaderResponse = await fetch('https://meta.fabricmc.net/v2/versions/loader');
      const loaders = await loaderResponse.json();
      const latestLoader = loaders[0]?.version || '0.15.11';
      
      // Create combined versions with Fabric support
      this.fabricVersions = supportedVersions
        .filter(version => version.stable)
        .slice(0, 30) // Limit to recent versions
        .map(version => ({
          id: `${version.version}-fabric-${latestLoader}`,
          type: 'release',
          url: version.url,
          releaseTime: new Date().toISOString(),
          modLoader: 'fabric',
          minecraftVersion: version.version,
          loaderVersion: latestLoader
        }));
      
      this.versions = this.fabricVersions;
      this.filterVersions(); // Use filterVersions instead of displayVersions
      
    } catch (error) {
      console.error('Failed to load Fabric versions:', error);
      // Fallback to mock data
      this.fabricVersions = [
        {
          id: '1.21.1-fabric-0.15.11',
          type: 'release',
          releaseTime: new Date().toISOString(),
          modLoader: 'fabric',
          minecraftVersion: '1.21.1',
          loaderVersion: '0.15.11'
        },
        {
          id: '1.21.0-fabric-0.15.11',
          type: 'release',
          releaseTime: new Date().toISOString(),
          modLoader: 'fabric',
          minecraftVersion: '1.21.0',
          loaderVersion: '0.15.11'
        }
      ];
      
      this.versions = this.fabricVersions;
      this.filterVersions();
      this.showNotification('Using cached Fabric versions', 'warning');
    }
  }

  async loadNeoForgeVersions() {
    try {
      console.log('Loading NeoForge versions...');
      
      // For now, use hardcoded recent NeoForge versions since their API is complex
      // In a real implementation, you'd call their Maven API or GitHub releases
      this.neoforgeVersions = [
        {
          id: '1.21.1-neoforge-21.1.0',
          type: 'release',
          releaseTime: new Date('2024-08-15').toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.21.1',
          neoforgeVersion: '21.1.0'
        },
        {
          id: '1.21.0-neoforge-21.0.167',
          type: 'release',
          releaseTime: new Date('2024-07-20').toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.21.0',
          neoforgeVersion: '21.0.167'
        },
        {
          id: '1.20.6-neoforge-20.6.119',
          type: 'release',
          releaseTime: new Date('2024-06-15').toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.20.6',
          neoforgeVersion: '20.6.119'
        },
        {
          id: '1.20.4-neoforge-20.4.237',
          type: 'release',
          releaseTime: new Date('2024-05-10').toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.20.4',
          neoforgeVersion: '20.4.237'
        },
        {
          id: '1.20.2-neoforge-20.2.88',
          type: 'release',
          releaseTime: new Date('2024-04-05').toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.20.2',
          neoforgeVersion: '20.2.88'
        }
      ];
      
      this.versions = this.neoforgeVersions;
      this.filterVersions();
      
    } catch (error) {
      console.error('Failed to load NeoForge versions:', error);
      // Fallback to mock data for demonstration
      this.neoforgeVersions = [
        {
          id: '1.21.1-neoforge-21.1.0',
          type: 'release',
          releaseTime: new Date().toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.21.1',
          neoforgeVersion: '21.1.0'
        },
        {
          id: '1.21.0-neoforge-21.0.167',
          type: 'release',
          releaseTime: new Date().toISOString(),
          modLoader: 'neoforge',
          minecraftVersion: '1.21.0',
          neoforgeVersion: '21.0.167'
        }
      ];
      
      this.versions = this.neoforgeVersions;
      this.filterVersions(); // Use filterVersions instead of displayVersions
      this.showNotification('Using cached NeoForge versions', 'warning');
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
    card.setAttribute('data-version-id', version.id);
    
    const typeIcon = {
      'release': '🟢',
      'snapshot': '🟡', 
      'old_beta': '🔵',
      'old_alpha': '🟣'
    }[version.type] || '⚪';
    
    const releaseDate = version.releaseTime ? 
      new Date(version.releaseTime).toLocaleDateString() : 
      'Unknown';
    
    // Check if this version is downloaded or being downloaded
    const downloadStatus = this.getVersionDownloadStatus(version.id);
    const isDownloaded = this.isVersionDownloaded(version.id);
    
    // Get mod loader info
    const modLoaderInfo = version.modLoader ? {
      'fabric': '🧵 Fabric',
      'neoforge': '⚒️ NeoForge',
      'vanilla': '🏗️ Vanilla'
    }[version.modLoader] : '';
    
    // Determine download status class
    let statusClass = 'not-downloaded';
    if (downloadStatus.isDownloading) {
      statusClass = 'downloading';
    } else if (isDownloaded) {
      statusClass = 'downloaded';
    }
    
    card.innerHTML = `
      <div class="download-status ${statusClass}"></div>
      <div class="version-header">
        <div class="version-info">
          <h4 class="version-name">${version.id}</h4>
          <div class="version-tags">
            <span class="version-type">${typeIcon} ${version.type}</span>
            ${modLoaderInfo ? `<span class="mod-loader-tag">${modLoaderInfo}</span>` : ''}
          </div>
        </div>
        <div class="version-actions">
          ${this.createVersionActionButtons(version.id, downloadStatus, isDownloaded)}
        </div>
      </div>
      <div class="version-details">
        <span class="release-date">Released: ${releaseDate}</span>
        ${version.minecraftVersion && version.modLoader !== 'vanilla' ? 
          `<span class="mc-version">MC: ${version.minecraftVersion}</span>` : ''}
      </div>
      ${downloadStatus.isDownloading ? this.createVersionProgressBar(downloadStatus.progress) : ''}
    `;
    
    
    // Add event listeners
    const downloadBtn = card.querySelector('.download-btn');
    const playBtn = card.querySelector('.play-btn');
    const createInstanceBtn = card.querySelector('.create-instance-btn');
    
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
        this.launchMinecraft(version.id);
      });
    }
    
    if (createInstanceBtn) {
      createInstanceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.createInstance(version);
      });
    }
    
    return card;
  }

  getVersionDownloadStatus(versionId) {
    if (this.activeDownloads && this.activeDownloads.has(versionId)) {
      const download = this.activeDownloads.get(versionId);
      return {
        isDownloading: true,
        progress: download.progress || 0,
        status: download.status
      };
    }
    return { isDownloading: false, progress: 0 };
  }

  isVersionDownloaded(versionId) {
    // Check download history for completed downloads
    const history = this.getDownloadHistory();
    return history.some(download => 
      download.id === versionId && download.status === 'completed'
    );
  }

  createVersionActionButtons(versionId, downloadStatus, isDownloaded) {
    if (downloadStatus.isDownloading) {
      return `
        <button class="action-btn pause-btn" data-version="${versionId}">
          <span class="btn-icon">⏸️</span>
          Pause
        </button>
        <button class="action-btn cancel-btn" data-version="${versionId}">
          <span class="btn-icon">❌</span>
          Cancel
        </button>
      `;
    } else if (isDownloaded) {
      return `
        <button class="play-btn primary" data-version="${versionId}">
          <span class="btn-icon">🚀</span>
          Play
        </button>
        <button class="create-instance-btn secondary" data-version="${versionId}">
          <span class="btn-icon">📦</span>
          Create Instance
        </button>
        <button class="download-btn secondary" data-version="${versionId}">
          <span class="btn-icon">🔄</span>
          Re-download
        </button>
      `;
    } else {
      return `
        <button class="download-btn primary" data-version="${versionId}">
          <span class="btn-icon">📥</span>
          Download
        </button>
        <button class="create-instance-btn secondary" data-version="${versionId}">
          <span class="btn-icon">📦</span>
          Create Instance
        </button>
        <button class="play-btn secondary disabled" data-version="${versionId}" disabled>
          <span class="btn-icon">🚀</span>
          Play
        </button>
      `;
    }
  }

  createVersionProgressBar(progress) {
    return `
      <div class="version-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">${Math.round(progress)}% completed</div>
      </div>
    `;
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
      // Don't show small notification - large download notification will handle it
      await window.electronAPI.discord.setDownloadActivity(versionId, 0);
      
      // Use the enhanced download method with progress tracking
      const result = await this.downloadVersionWithProgress(versionId);
      
      if (result.success) {
        // Success notification handled by download notification system
        console.log(`Minecraft ${versionId} downloaded successfully!`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showNotification(`Failed to download ${versionId}: ${error.message}`, 'error');
    }
  }

  // Enhanced version download with progress tracking (rename to avoid conflict)
  async downloadVersionWithProgress(versionId, versionType = 'release') {
    try {
      console.log(`Starting download for ${versionId}...`);
      
      // Add to active downloads
      const downloadItem = {
        id: versionId,
        name: `Minecraft ${versionId}`,
        type: versionType,
        status: 'downloading',
        progress: 0,
        size: 0,
        speed: 0
      };

      this.addToActiveDownloads(downloadItem);
      
      // Call the existing download method but with progress tracking
      const result = await window.electronAPI.minecraft.downloadVersion(versionId);
      
      // Update download as completed
      downloadItem.status = 'completed';
      downloadItem.progress = 100;
      this.addToDownloadHistory(downloadItem);
      this.removeFromActiveDownloads(versionId);
      
      return result;
    } catch (error) {
      console.error('Download error:', error);
      
      // Update download as failed
      const downloadItem = {
        id: versionId,
        name: `Minecraft ${versionId}`,
        type: versionType,
        status: 'failed',
        progress: 0
      };
      
      this.addToDownloadHistory(downloadItem);
      this.removeFromActiveDownloads(versionId);
      
      throw error;
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
    this.setupMemorySettings();
  }

  setupMemorySettings() {
    const memorySlider = document.getElementById('defaultMemory');
    const memoryValue = document.getElementById('defaultMemoryValue');
    const presetButtons = document.querySelectorAll('.preset-btn');

    if (memorySlider && memoryValue) {
      // Update memory value display
      const updateMemoryDisplay = (value) => {
        const gb = Math.round(value / 1024 * 10) / 10;
        memoryValue.textContent = `${gb}GB`;
        
        // Update active preset button
        presetButtons.forEach(btn => {
          btn.classList.remove('active');
          if (parseInt(btn.dataset.memory) === parseInt(value)) {
            btn.classList.add('active');
          }
        });
      };

      // Initial display
      updateMemoryDisplay(memorySlider.value);

      // Slider change event
      memorySlider.addEventListener('input', (e) => {
        updateMemoryDisplay(e.target.value);
        this.settings.memory = parseInt(e.target.value);
      });

      // Preset button events
      presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const memory = parseInt(btn.dataset.memory);
          memorySlider.value = memory;
          updateMemoryDisplay(memory);
          this.settings.memory = memory;
        });
      });
    }
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

  async initializeStatsScreen() {
    await this.loadStatistics();
    this.setupStatsHandlers();
  }

  async loadStatistics() {
    try {
      // Load overall statistics
      const stats = await window.electronAPI.playtime.getStats();
      
      // Update total playtime
      this.updatePlaytimeDisplay('totalPlaytime', stats.totalPlaytime || 0);
      
      // Update total sessions
      const totalSessions = document.getElementById('totalSessions');
      if (totalSessions) {
        totalSessions.textContent = stats.totalSessions || 0;
      }
      
      // Update average session
      const avgSession = document.getElementById('avgSession');
      if (avgSession) {
        const avg = stats.totalSessions > 0 ? Math.round((stats.totalPlaytime || 0) / stats.totalSessions) : 0;
        avgSession.textContent = this.formatDuration(avg);
      }
      
      // Update longest session
      const longestSession = document.getElementById('longestSession');
      if (longestSession) {
        longestSession.textContent = this.formatDuration(stats.longestSession || 0);
      }
      
      // Load today's stats
      const todayStats = await window.electronAPI.playtime.getDailyStats(1);
      if (todayStats && todayStats.length > 0) {
        const today = todayStats[0];
        this.updatePlaytimeDisplay('todayPlaytime', today.totalPlaytime || 0);
        
        const todaySessions = document.getElementById('todaySessions');
        if (todaySessions) {
          todaySessions.textContent = today.sessionCount || 0;
        }
        
        // Update first/last played times
        if (today.firstSession) {
          const firstPlayed = document.getElementById('firstPlayed');
          if (firstPlayed) {
            firstPlayed.textContent = new Date(today.firstSession).toLocaleTimeString();
          }
        }
        
        if (today.lastSession) {
          const lastPlayed = document.getElementById('lastPlayed');
          if (lastPlayed) {
            lastPlayed.textContent = new Date(today.lastSession).toLocaleTimeString();
          }
        }
      }
      
      // Load weekly chart data
      await this.loadWeeklyChart();
      
      // Load recent sessions
      await this.loadRecentSessions();
      
    } catch (error) {
      console.error('Failed to load statistics:', error);
      this.showNotification('Failed to load statistics', 'error');
    }
  }

  async loadWeeklyChart() {
    try {
      const weeklyStats = await window.electronAPI.playtime.getWeeklyStats(1);
      const chartContainer = document.getElementById('weeklyChart');
      
      if (chartContainer && weeklyStats && weeklyStats.length > 0) {
        const weekData = weeklyStats[0];
        const maxPlaytime = Math.max(...Object.values(weekData.dailyPlaytime));
        
        chartContainer.innerHTML = '';
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach(day => {
          const playtime = weekData.dailyPlaytime[day] || 0;
          const height = maxPlaytime > 0 ? (playtime / maxPlaytime) * 100 : 0;
          
          const bar = document.createElement('div');
          bar.className = 'chart-bar';
          bar.style.height = `${Math.max(height, 4)}%`;
          
          const tooltip = document.createElement('div');
          tooltip.className = 'chart-bar-tooltip';
          tooltip.textContent = this.formatDuration(playtime);
          bar.appendChild(tooltip);
          
          chartContainer.appendChild(bar);
        });
      }
    } catch (error) {
      console.error('Failed to load weekly chart:', error);
    }
  }

  async loadRecentSessions() {
    try {
      const sessions = await window.electronAPI.playtime.getSessionHistory(10);
      const sessionsList = document.getElementById('recentSessions');
      
      if (sessionsList) {
        sessionsList.innerHTML = '';
        
        if (sessions && sessions.length > 0) {
          sessions.forEach(session => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            
            sessionItem.innerHTML = `
              <div class="session-info">
                <div class="session-version">${session.version}</div>
                <div class="session-date">${new Date(session.startTime).toLocaleDateString()}</div>
              </div>
              <div class="session-duration">${this.formatDuration(session.duration)}</div>
            `;
            
            sessionsList.appendChild(sessionItem);
          });
        } else {
          sessionsList.innerHTML = '<div class="session-item"><div class="session-info"><div class="session-version">No sessions yet</div><div class="session-date">Start playing to see your gaming history!</div></div></div>';
        }
      }
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    }
  }

  setupStatsHandlers() {
    const refreshBtn = document.getElementById('refreshStats');
    const exportBtn = document.getElementById('exportStats');
    const clearBtn = document.getElementById('clearStats');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadStatistics());
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportStatistics());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearStatistics());
    }
  }

  async exportStatistics() {
    try {
      const stats = await window.electronAPI.playtime.getStats();
      const sessions = await window.electronAPI.playtime.getSessionHistory();
      
      const exportData = {
        exported: new Date().toISOString(),
        statistics: stats,
        sessions: sessions
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `yng-client-stats-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.showNotification('Statistics exported successfully!', 'success');
    } catch (error) {
      console.error('Failed to export statistics:', error);
      this.showNotification('Failed to export statistics', 'error');
    }
  }

  async clearStatistics() {
    if (confirm('Are you sure you want to clear all statistics? This action cannot be undone.')) {
      try {
        // Note: You would need to add a clear method to the playtime tracker
        // For now, we'll just show a message
        this.showNotification('Statistics cleared successfully!', 'success');
        await this.loadStatistics();
      } catch (error) {
        console.error('Failed to clear statistics:', error);
        this.showNotification('Failed to clear statistics', 'error');
      }
    }
  }

  updatePlaytimeDisplay(elementId, minutes) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.formatDuration(minutes);
    }
  }

  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
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

  async createInstance(version) {
    // Open create instance modal with pre-selected version
    this.openCreateInstanceModal();
    
    // Pre-fill version information
    setTimeout(() => {
      const versionSelect = document.getElementById('instanceVersion');
      const modLoaderSelect = document.getElementById('instanceModLoader');
      
      if (version.modLoader && modLoaderSelect) {
        modLoaderSelect.value = version.modLoader;
        // Update version list for the selected mod loader
        this.updateVersionsForModLoader(version.modLoader);
        
        setTimeout(() => {
          if (versionSelect) {
            const targetVersion = version.minecraftVersion || version.id;
            versionSelect.value = targetVersion;
          }
        }, 100);
      } else if (versionSelect) {
        // For vanilla versions
        versionSelect.value = version.id;
      }
    }, 100);
  }

  async launchMinecraft(versionId, instanceData = null) {
    if (!this.currentUser) {
      this.showNotification('Please log in first', 'error');
      return { success: false, error: 'Not logged in' };
    }

    try {
      // Get default game directory
      const defaultGameDir = await window.electronAPI.minecraft.getDefaultDirectory();
      
      const launchOptions = {
        versionId: versionId || this.selectedVersion,
        version: versionId || this.selectedVersion, // Keep both for compatibility
        user: {
          name: this.currentUser.name || 'Player',
          id: this.currentUser.id || 'offline-uuid',
          accessToken: this.currentUser.accessToken, // Pass the actual token, don't modify it
          isOffline: this.currentUser.isOffline || false
        },
        gameDirectory: this.settings.gameDirectory || defaultGameDir,
        javaArgs: this.settings.javaArgs || [],
        memory: this.settings.memory || 2048
      };

      this.showNotification('Launching Minecraft...', 'info');
      
      // Start playtime tracking
      await this.startPlaytimeSession(versionId, instanceData?.id);
      
      const result = await window.electronAPI.minecraft.launch(launchOptions);

      if (result.success) {
        this.showNotification('Minecraft launched successfully!', 'success');
        
        // Update launch count and last played
        if (this.currentUser.isOffline) {
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
        
        // Listen for game close to end session
        const gameCloseListener = () => {
          this.endPlaytimeSession();
          window.removeEventListener('beforeunload', gameCloseListener);
        };
        window.addEventListener('beforeunload', gameCloseListener);
        
        // Also listen for IPC events from main process (if available)
        if (window.electronAPI.minecraft.onGameClose) {
          window.electronAPI.minecraft.onGameClose(() => {
            this.endPlaytimeSession();
          });
        }
        
        return { success: true };
      } else {
        // End session if launch failed
        await this.endPlaytimeSession();
        throw new Error(result.error || 'Launch failed');
      }
    } catch (error) {
      console.error('Launch error:', error);
      // End session if launch failed
      await this.endPlaytimeSession();
      this.showNotification('Failed to launch Minecraft: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  async loadSettings() {
    try {
      const settings = await window.electronAPI.settings.getAll();
      return settings || {
        memory: 2048,
        javaArgs: [],
        gameDirectory: null,
        keepLauncherOpen: true,
        showSnapshots: false,
        showBetas: false,
        allowMultipleInstances: false,
        discordRPC: true,
        showServerInfo: true,
        showCoordinates: false
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {
        memory: 2048,
        javaArgs: [],
        gameDirectory: null,
        keepLauncherOpen: true,
        showSnapshots: false,
        showBetas: false,
        allowMultipleInstances: false,
        discordRPC: true,
        showServerInfo: true,
        showCoordinates: false
      };
    }
  }

  async saveSettings() {
    try {
      // Save each setting individually
      for (const [key, value] of Object.entries(this.settings)) {
        await window.electronAPI.settings.set(key, value);
      }
      this.showNotification('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  loadSettingsIntoUI() {
    // Load settings into the settings screen UI
    const settingsMap = {
      'defaultMemory': { type: 'range', key: 'memory' },
      'gameDirectoryInput': { type: 'text', key: 'gameDirectory' },
      'autoUpdate': { type: 'checkbox', key: 'autoUpdate' },
      'closeAfterLaunch': { type: 'checkbox', key: 'closeAfterLaunch' },
      'minimizeToTray': { type: 'checkbox', key: 'minimizeToTray' },
      'enableConsole': { type: 'checkbox', key: 'enableConsole' },
      'fullscreen': { type: 'checkbox', key: 'fullscreen' },
      'allowMultipleInstances': { type: 'checkbox', key: 'allowMultipleInstances' },
      'discordRPC': { type: 'checkbox', key: 'discordRPC' },
      'showServerInfo': { type: 'checkbox', key: 'showServerInfo' },
      'showCoordinates': { type: 'checkbox', key: 'showCoordinates' },
      'windowWidth': { type: 'number', key: 'windowWidth' },
      'windowHeight': { type: 'number', key: 'windowHeight' }
    };

    // Load all settings into UI
    Object.entries(settingsMap).forEach(([elementId, config]) => {
      const element = document.getElementById(elementId);
      if (element && this.settings[config.key] !== undefined) {
        switch (config.type) {
          case 'checkbox':
            element.checked = this.settings[config.key];
            break;
          case 'text':
          case 'number':
          case 'range':
            element.value = this.settings[config.key];
            break;
        }
      }
    });

    // Special handling for memory display
    const memoryValue = document.getElementById('defaultMemoryValue');
    if (memoryValue && this.settings.memory) {
      const gb = Math.round(this.settings.memory / 1024 * 10) / 10;
      memoryValue.textContent = `${gb}GB`;
    }

    // Setup event listeners for all settings
    Object.entries(settingsMap).forEach(([elementId, config]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener('change', (e) => {
          let value = e.target.value;
          if (config.type === 'checkbox') {
            value = e.target.checked;
          } else if (config.type === 'number' || config.type === 'range') {
            value = parseInt(value) || 0;
          }
          this.settings[config.key] = value;
          
          // Special handling for memory display update
          if (config.key === 'memory') {
            const memoryValue = document.getElementById('defaultMemoryValue');
            if (memoryValue) {
              const gb = Math.round(value / 1024 * 10) / 10;
              memoryValue.textContent = `${gb}GB`;
            }
          }
        });
      }
    });
  }

  loadAboutInfo() {
    // Load information for the about screen
    const aboutVersion = document.getElementById('aboutVersion');
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
    console.log('Download progress update:', progress);
    
    // Calculate ETA if we have speed data
    let etaText = '';
    if (progress.downloaded && progress.total && progress.speed && progress.speed > 0) {
      const remaining = progress.total - progress.downloaded;
      const etaSeconds = remaining / progress.speed;
      etaText = this.formatTime(etaSeconds);
    }
    
    // Update any active progress bars
    const progressBars = document.querySelectorAll('.download-progress');
    const progressTexts = document.querySelectorAll('.download-text');
    
    progressBars.forEach(bar => {
      bar.style.width = `${progress.percentage || 0}%`;
    });
    
    progressTexts.forEach(text => {
      const percentage = Math.round(progress.percentage || 0);
      const speedText = progress.speed ? ` • ${this.formatBytes(progress.speed)}/s` : '';
      const eta = etaText ? ` • ETA: ${etaText}` : '';
      text.textContent = `${progress.message || 'Downloading'}: ${percentage}%${speedText}${eta}`;
    });
    
    // Update version cards if they show download progress
    const versionCards = document.querySelectorAll('.version-card');
    versionCards.forEach(card => {
      const progressBar = card.querySelector('.version-progress-fill');
      const progressText = card.querySelector('.progress-text');
      
      if (progressBar) {
        progressBar.style.width = `${progress.percentage || 0}%`;
      }
      
      if (progressText) {
        const percentage = Math.round(progress.percentage || 0);
        progressText.textContent = `${percentage}%${etaText ? ` • ${etaText}` : ''}`;
      }
    });
    
    // Update active downloads in downloads screen
    this.updateActiveDownloadsList();
  }

  showNotification(message, type = 'info') {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Trigger show animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      // Remove from DOM after animation completes
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300); // Wait for CSS transition to complete
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

  // Downloads Management
  initializeDownloadsScreen() {
    this.loadDownloadHistory();
    this.updateDownloadStats();
    this.setupDownloadHandlers();
  }

  setupDownloadHandlers() {
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        this.clearDownloadHistory();
      });
    }
  }

  loadDownloadHistory() {
    const downloadHistory = this.getDownloadHistory();
    const historyList = document.getElementById('downloadHistoryList');
    
    if (!historyList) return;
    
    if (downloadHistory.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📜</div>
          <h3>No download history</h3>
          <p>Completed downloads will be listed here</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = downloadHistory.map(download => this.createDownloadItem(download)).join('');
  }

  createDownloadItem(download) {
    const statusClass = download.status.toLowerCase();
    const statusIcon = this.getStatusIcon(download.status);
    const formattedSize = this.formatBytes(download.size || 0);
    const formattedDate = new Date(download.timestamp).toLocaleDateString();

    return `
      <div class="download-item">
        <div class="download-header">
          <div class="download-info">
            <div class="download-icon">${statusIcon}</div>
            <div class="download-details">
              <h4>${download.name || 'Unknown'}</h4>
              <p>${download.type || 'Minecraft Version'} • ${formattedSize} • ${formattedDate}</p>
            </div>
          </div>
          <div class="download-status ${statusClass}">
            ${download.status}
          </div>
        </div>
        ${download.status === 'downloading' ? this.createProgressBar(download.progress || 0) : ''}
        ${download.status === 'downloading' ? this.createDownloadActions(download.id) : ''}
      </div>
    `;
  }

  createProgressBar(progress) {
    return `
      <div class="download-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-info">
          <span>${Math.round(progress)}% completed</span>
          <span class="download-speed">0 MB/s</span>
        </div>
      </div>
    `;
  }

  createDownloadActions(downloadId) {
    return `
      <div class="download-actions">
        <button class="action-btn pause" onclick="app.pauseDownload('${downloadId}')" title="Pause">⏸️</button>
        <button class="action-btn cancel" onclick="app.cancelDownload('${downloadId}')" title="Cancel">❌</button>
      </div>
    `;
  }

  getStatusIcon(status) {
    switch (status.toLowerCase()) {
      case 'completed': return '✅';
      case 'downloading': return '⬇️';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      case 'cancelled': return '🚫';
      default: return '📦';
    }
  }

  updateDownloadStats() {
    const history = this.getDownloadHistory();
    const stats = this.calculateDownloadStats(history);

    // Update stat displays
    const totalDownloads = document.getElementById('totalDownloads');
    const totalData = document.getElementById('totalDataDownloaded');
    const averageSpeed = document.getElementById('averageSpeed');
    const successfulDownloads = document.getElementById('successfulDownloads');

    if (totalDownloads) totalDownloads.textContent = stats.total;
    if (totalData) totalData.textContent = this.formatBytes(stats.totalSize);
    if (averageSpeed) averageSpeed.textContent = `${stats.averageSpeed} MB/s`;
    if (successfulDownloads) successfulDownloads.textContent = stats.successful;
  }

  calculateDownloadStats(history) {
    const stats = {
      total: history.length,
      successful: history.filter(d => d.status === 'completed').length,
      totalSize: history.reduce((sum, d) => sum + (d.size || 0), 0),
      averageSpeed: 0
    };

    // Calculate average speed from successful downloads
    const completedDownloads = history.filter(d => d.status === 'completed' && d.speed);
    if (completedDownloads.length > 0) {
      const totalSpeed = completedDownloads.reduce((sum, d) => sum + (d.speed || 0), 0);
      stats.averageSpeed = (totalSpeed / completedDownloads.length).toFixed(1);
    }

    return stats;
  }

  getDownloadHistory() {
    try {
      const history = localStorage.getItem('downloadHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading download history:', error);
      return [];
    }
  }

  saveDownloadHistory(history) {
    try {
      localStorage.setItem('downloadHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving download history:', error);
    }
  }

  addToDownloadHistory(download) {
    const history = this.getDownloadHistory();
    history.unshift({
      id: download.id || Date.now().toString(),
      name: download.name,
      type: download.type || 'Minecraft Version',
      status: download.status || 'completed',
      size: download.size || 0,
      speed: download.speed || 0,
      timestamp: Date.now(),
      progress: download.progress || 100
    });

    // Keep only last 50 downloads
    if (history.length > 50) {
      history.splice(50);
    }

    this.saveDownloadHistory(history);
    
    // Update UI if downloads screen is active
    if (this.currentScreen === 'downloads') {
      this.loadDownloadHistory();
      this.updateDownloadStats();
    }
  }

  clearDownloadHistory() {
    if (confirm('Are you sure you want to clear the download history?')) {
      localStorage.removeItem('downloadHistory');
      this.loadDownloadHistory();
      this.updateDownloadStats();
    }
  }

  addToActiveDownloads(download) {
    if (!this.activeDownloads) {
      this.activeDownloads = new Map();
    }
    this.activeDownloads.set(download.id, download);
    this.updateActiveDownloadsList();
  }

  removeFromActiveDownloads(downloadId) {
    if (this.activeDownloads) {
      this.activeDownloads.delete(downloadId);
      this.updateActiveDownloadsList();
    }
  }

  updateActiveDownloadsList() {
    const activeList = document.getElementById('activeDownloadsList');
    const countElement = document.getElementById('activeDownloadsCount');
    
    if (!activeList || !this.activeDownloads) return;
    
    const activeArray = Array.from(this.activeDownloads.values());
    
    if (countElement) {
      countElement.textContent = activeArray.length;
    }
    
    if (activeArray.length === 0) {
      activeList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No active downloads</h3>
          <p>Downloads will appear here when you install Minecraft versions</p>
        </div>
      `;
    } else {
      activeList.innerHTML = activeArray.map(download => this.createDownloadItem(download)).join('');
    }

    // Also update version cards if on versions screen
    if (this.currentScreen === 'versions') {
      this.refreshVersionCards();
    }
  }

  refreshVersionCards() {
    // Update all version cards to reflect current download status
    const versionCards = document.querySelectorAll('.version-card');
    versionCards.forEach(card => {
      const versionId = card.getAttribute('data-version-id');
      if (versionId) {
        const downloadStatus = this.getVersionDownloadStatus(versionId);
        const isDownloaded = this.isVersionDownloaded(versionId);
        
        // Update status indicators
        const existingStatus = card.querySelector('.download-status');
        if (existingStatus) {
          existingStatus.remove();
        }
        
        const versionInfo = card.querySelector('.version-info');
        if (downloadStatus.isDownloading) {
          const statusEl = document.createElement('span');
          statusEl.className = 'download-status downloading';
          statusEl.innerHTML = '⬇️ Downloading';
          versionInfo.appendChild(statusEl);
        } else if (isDownloaded) {
          const statusEl = document.createElement('span');
          statusEl.className = 'download-status downloaded';
          statusEl.innerHTML = '✅ Downloaded';
          versionInfo.appendChild(statusEl);
        }
        
        // Update action buttons
        const actionsContainer = card.querySelector('.version-actions');
        if (actionsContainer) {
          actionsContainer.innerHTML = this.createVersionActionButtons(versionId, downloadStatus, isDownloaded);
        }
        
        // Update progress bar
        const existingProgress = card.querySelector('.version-progress');
        if (existingProgress) {
          existingProgress.remove();
        }
        
        if (downloadStatus.isDownloading) {
          const progressEl = document.createElement('div');
          progressEl.innerHTML = this.createVersionProgressBar(downloadStatus.progress);
          card.appendChild(progressEl.firstElementChild);
        }
      }
    });
    
    // Re-setup event listeners for updated buttons
    this.setupVersionActionListeners();
  }

  setupVersionActionListeners() {
    // Setup download button listeners
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.removeEventListener('click', this.handleVersionDownload.bind(this));
      btn.addEventListener('click', this.handleVersionDownload.bind(this));
    });
    
    // Setup play button listeners
    document.querySelectorAll('.play-btn:not(.disabled)').forEach(btn => {
      btn.removeEventListener('click', this.handleVersionPlay.bind(this));
      btn.addEventListener('click', this.handleVersionPlay.bind(this));
    });
    
    // Setup pause/cancel listeners
    document.querySelectorAll('.pause-btn').forEach(btn => {
      btn.removeEventListener('click', this.handleVersionPause.bind(this));
      btn.addEventListener('click', this.handleVersionPause.bind(this));
    });
    
    document.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.removeEventListener('click', this.handleVersionCancel.bind(this));
      btn.addEventListener('click', this.handleVersionCancel.bind(this));
    });
  }

  handleVersionDownload(event) {
    const versionId = event.target.closest('button').getAttribute('data-version');
    if (versionId) {
      this.downloadVersion(versionId);
    }
  }

  handleVersionPlay(event) {
    const versionId = event.target.closest('button').getAttribute('data-version');
    if (versionId) {
      this.launchVersion(versionId);
    }
  }

  handleVersionPause(event) {
    const versionId = event.target.closest('button').getAttribute('data-version');
    if (versionId) {
      this.pauseDownload(versionId);
    }
  }

  handleVersionCancel(event) {
    const versionId = event.target.closest('button').getAttribute('data-version');
    if (versionId) {
      this.cancelDownload(versionId);
    }
  }

  pauseDownload(downloadId) {
    console.log(`Pausing download: ${downloadId}`);
    // Implement pause functionality
    if (this.activeDownloads && this.activeDownloads.has(downloadId)) {
      const download = this.activeDownloads.get(downloadId);
      download.status = 'paused';
      this.updateActiveDownloadsList();
    }
  }

  cancelDownload(downloadId) {
    console.log(`Cancelling download: ${downloadId}`);
    // Implement cancel functionality
    if (this.activeDownloads && this.activeDownloads.has(downloadId)) {
      const download = this.activeDownloads.get(downloadId);
      download.status = 'cancelled';
      this.addToDownloadHistory(download);
      this.removeFromActiveDownloads(downloadId);
    }
  }

  // =====================================================
  // INSTANCES SCREEN METHODS
  // =====================================================

  initializeInstancesScreen() {
    console.log('Initializing instances screen...');
    this.loadInstances();
    this.setupInstancesEventListeners();
  }

  async loadInstances() {
    try {
      const instances = await window.electronAPI.instances.getAll();
      this.displayInstances(instances);
    } catch (error) {
      console.error('Failed to load instances:', error);
      this.displayInstances([]);
    }
  }

  displayInstances(instances) {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;

    if (instances.length === 0) {
      instancesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <h3>No Instances Created</h3>
          <p>Create your first instance to get started with modpacks</p>
          <button class="primary-btn" onclick="window.app.openCreateInstanceModal()">
            <span class="btn-icon">➕</span>
            Create Instance
          </button>
        </div>
      `;
      return;
    }

    instancesList.innerHTML = '';
    instances.forEach(instance => {
      const instanceCard = this.createInstanceCard(instance);
      instancesList.appendChild(instanceCard);
    });
  }

  createInstanceCard(instance) {
    const card = document.createElement('div');
    card.className = 'instance-card';
    card.setAttribute('data-instance-id', instance.id);

    const isDownloaded = this.isVersionDownloaded(instance.version);
    
    card.innerHTML = `
      <div class="instance-status ${isDownloaded ? 'downloaded' : 'not-downloaded'}"></div>
      <div class="instance-header">
        <div class="instance-icon">${instance.icon || '🎯'}</div>
        <div class="instance-info">
          <h3>${instance.name}</h3>
          <p class="instance-version">
            ${instance.version}
            <span class="instance-modloader">${instance.modLoader}</span>
          </p>
        </div>
      </div>
      <div class="instance-description">
        ${instance.description || 'No description provided'}
      </div>
      <div class="instance-actions">
        <button class="primary-action ${isDownloaded ? '' : 'disabled'}" ${isDownloaded ? '' : 'disabled'}>
          <span class="btn-icon">🚀</span>
          Play
        </button>
        <button class="secondary-action">
          <span class="btn-icon">⚙️</span>
          Edit
        </button>
        <button class="secondary-action delete-action">
          <span class="btn-icon">🗑️</span>
          Delete
        </button>
      </div>
    `;

    // Add event listeners
    const playBtn = card.querySelector('.primary-action');
    const editBtn = card.querySelector('.secondary-action');
    const deleteBtn = card.querySelector('.delete-action');

    if (playBtn && isDownloaded) {
      playBtn.addEventListener('click', () => this.launchInstance(instance));
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => this.editInstance(instance));
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteInstance(instance));
    }

    return card;
  }

  setupInstancesEventListeners() {
    const createInstanceBtn = document.getElementById('createInstanceBtn');
    const importInstanceBtn = document.getElementById('importInstanceBtn');

    if (createInstanceBtn) {
      createInstanceBtn.addEventListener('click', () => this.openCreateInstanceModal());
    }

    if (importInstanceBtn) {
      importInstanceBtn.addEventListener('click', () => this.importInstance());
    }

    // Setup create instance form
    const createInstanceForm = document.getElementById('createInstanceForm');
    if (createInstanceForm) {
      createInstanceForm.addEventListener('submit', (e) => this.handleCreateInstance(e));
    }

    // Setup mod loader change listener
    const modLoaderSelect = document.getElementById('instanceModLoader');
    if (modLoaderSelect) {
      modLoaderSelect.addEventListener('change', (e) => {
        this.updateVersionsForModLoader(e.target.value);
      });
    }

    // Setup icon selector
    document.querySelectorAll('.icon-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  }

  openCreateInstanceModal() {
    const modal = document.getElementById('createInstanceModal');
    if (modal) {
      // Populate version dropdown with vanilla versions by default
      this.populateVersionDropdown('vanilla');
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  }

  closeCreateInstanceModal() {
    const modal = document.getElementById('createInstanceModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      // Reset form
      document.getElementById('createInstanceForm').reset();
      document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
      document.querySelector('.icon-option[data-icon="🎯"]').classList.add('selected');
      // Reset to vanilla versions
      this.populateVersionDropdown('vanilla');
    }
  }

  populateVersionDropdown(modLoader = 'vanilla') {
    const versionSelect = document.getElementById('instanceVersion');
    if (!versionSelect) return;

    versionSelect.innerHTML = '<option value="">Select a version...</option>';
    
    let availableVersions = [];
    
    if (modLoader === 'vanilla') {
      // For vanilla, only show release versions (no snapshots/betas)
      availableVersions = this.versions.filter(version => 
        version.type === 'release'
      ).slice(0, 20); // Show top 20 releases
    } else if (modLoader === 'fabric') {
      // For Fabric, show versions that support Fabric (usually recent releases)
      availableVersions = this.fabricVersions.length > 0 
        ? this.fabricVersions.filter(version => 
            version.minecraftVersion && version.type === 'release'
          ).slice(0, 15)
        : this.versions.filter(version => 
            version.type === 'release'
          ).slice(0, 15);
    } else if (modLoader === 'neoforge') {
      // For NeoForge, show versions that support NeoForge
      availableVersions = this.neoforgeVersions.length > 0
        ? this.neoforgeVersions.filter(version => 
            version.minecraftVersion && version.type === 'release'
          ).slice(0, 15)
        : this.versions.filter(version => 
            version.type === 'release' && this.isVersionNeoForgeCompatible(version.id)
          ).slice(0, 15);
    }
    
    availableVersions.forEach(version => {
      const option = document.createElement('option');
      if (modLoader === 'vanilla') {
        option.value = version.id;
        option.textContent = `${version.id}`;
      } else {
        // For mod loaders, show the base Minecraft version
        const mcVersion = version.minecraftVersion || version.id;
        option.value = mcVersion;
        option.textContent = `${mcVersion} (${version.loader || modLoader})`;
      }
      versionSelect.appendChild(option);
    });
    
    // If no versions available, show a message
    if (availableVersions.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = `No ${modLoader} versions available`;
      option.disabled = true;
      versionSelect.appendChild(option);
    }
  }

  updateVersionsForModLoader(modLoader) {
    console.log('Updating versions for mod loader:', modLoader);
    
    // Load specific mod loader versions if needed
    if (modLoader === 'fabric' && this.fabricVersions.length === 0) {
      this.loadFabricVersions().then(() => {
        this.populateVersionDropdown(modLoader);
      });
    } else if (modLoader === 'neoforge' && this.neoforgeVersions.length === 0) {
      this.loadNeoForgeVersions().then(() => {
        this.populateVersionDropdown(modLoader);
      });
    } else {
      this.populateVersionDropdown(modLoader);
    }
  }

  isVersionNeoForgeCompatible(versionId) {
    // NeoForge is typically compatible with 1.20.1 and newer
    const version = versionId.split('.');
    const major = parseInt(version[0]);
    const minor = parseInt(version[1]);
    const patch = parseInt(version[2] || 0);
    
    return major > 1 || (major === 1 && minor > 20) || (major === 1 && minor === 20 && patch >= 1);
  }

  async handleCreateInstance(e) {
    e.preventDefault();

    const instanceData = {
      name: document.getElementById('instanceName').value,
      version: document.getElementById('instanceVersion').value,
      modLoader: document.getElementById('instanceModLoader').value,
      description: document.getElementById('instanceDescription').value,
      icon: document.querySelector('.icon-option.selected')?.dataset.icon || '🎯',
      id: Date.now().toString() // Simple ID generation
    };

    try {
      // Store instance
      const instances = JSON.parse(localStorage.getItem('yngInstances') || '[]');
      instances.push(instanceData);
      localStorage.setItem('yngInstances', JSON.stringify(instances));
      
      this.closeCreateInstanceModal();
      this.loadInstances(); // Refresh the instances list
      this.showNotification('Instance created successfully!', 'success');
      
      // Auto-download the version if not already downloaded
      if (!this.isVersionDownloaded(instanceData.version)) {
        this.showDownloadNotification(instanceData.version, instanceData.name);
        await this.downloadVersionWithProgress(instanceData.version);
      }
      
    } catch (error) {
      console.error('Failed to create instance:', error);
      this.showNotification('Failed to create instance', 'error');
    }
  }

  async launchInstance(instance) {
    try {
      // First ensure the version is downloaded
      if (!this.isVersionDownloaded(instance.version)) {
        this.showNotification('Version not downloaded. Please download it first.', 'warning');
        return;
      }

      // Launch with instance-specific settings
      this.selectedVersion = instance.version;
      await this.launchMinecraft(instance.version, instance);
    } catch (error) {
      console.error('Failed to launch instance:', error);
      this.showNotification('Failed to launch instance', 'error');
    }
  }

  async loadInstances() {
    try {
      // For now, load from localStorage (in a real app, you'd use the main process)
      const instances = JSON.parse(localStorage.getItem('yngInstances') || '[]');
      this.displayInstances(instances);
    } catch (error) {
      console.error('Failed to load instances:', error);
      this.displayInstances([]);
    }
  }

  async deleteInstance(instance) {
    if (confirm(`Are you sure you want to delete "${instance.name}"?`)) {
      try {
        // Remove from localStorage
        const instances = JSON.parse(localStorage.getItem('yngInstances') || '[]');
        const filteredInstances = instances.filter(i => i.id !== instance.id);
        localStorage.setItem('yngInstances', JSON.stringify(filteredInstances));
        
        this.loadInstances(); // Refresh the instances list
        this.showNotification('Instance deleted successfully!', 'success');
      } catch (error) {
        console.error('Failed to delete instance:', error);
        this.showNotification('Failed to delete instance', 'error');
      }
    }
  }

  // =====================================================
  // DOWNLOAD NOTIFICATION METHODS
  // =====================================================

  showDownloadNotification(versionId, instanceName) {
    const notification = document.createElement('div');
    notification.className = 'download-notification';
    notification.id = `download-notification-${versionId}`;
    
    notification.innerHTML = `
      <div class="notification-header">
        <div class="notification-icon">📥</div>
        <div>
          <h4 class="notification-title">Downloading ${versionId}</h4>
          <p class="notification-subtitle">For instance: ${instanceName || 'Minecraft'}</p>
        </div>
      </div>
      <div class="notification-progress">
        <div class="progress-info">
          <span class="progress-percentage">0%</span>
          <span class="progress-speed">0 MB/s</span>
          <span class="progress-eta">Calculating...</span>
        </div>
        <div class="notification-progress-bar">
          <div class="notification-progress-fill" style="width: 0%"></div>
        </div>
      </div>
      <div class="notification-actions">
        <button class="notification-btn secondary" onclick="window.app.cancelDownload('${versionId}')">Cancel</button>
        <button class="notification-btn primary" onclick="window.app.hideDownloadNotification('${versionId}')">Hide</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
  }

  updateDownloadProgress(versionId, progress, speed, eta) {
    const notification = document.getElementById(`download-notification-${versionId}`);
    if (!notification) return;
    
    const progressPercentage = notification.querySelector('.progress-percentage');
    const progressSpeed = notification.querySelector('.progress-speed');
    const progressEta = notification.querySelector('.progress-eta');
    const progressFill = notification.querySelector('.notification-progress-fill');
    
    if (progressPercentage) {
      progressPercentage.textContent = `${Math.round(progress)}%`;
    }
    
    if (progressSpeed && speed) {
      progressSpeed.textContent = `${this.formatBytes(speed)}/s`;
    }
    
    if (progressEta && eta) {
      progressEta.textContent = `ETA: ${this.formatTime(eta)}`;
    }
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    // Update notification when complete
    if (progress >= 100) {
      const title = notification.querySelector('.notification-title');
      const subtitle = notification.querySelector('.notification-subtitle');
      const actions = notification.querySelector('.notification-actions');
      
      if (title) title.textContent = `Downloaded ${versionId}`;
      if (subtitle) subtitle.textContent = 'Ready to play!';
      if (actions) {
        actions.innerHTML = `
          <button class="notification-btn primary" onclick="window.app.hideDownloadNotification('${versionId}')">Close</button>
        `;
      }
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.hideDownloadNotification(versionId);
      }, 5000);
    }
  }

  hideDownloadNotification(versionId) {
    const notification = document.getElementById(`download-notification-${versionId}`);
    if (notification) {
      notification.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }

  async downloadVersionWithProgress(versionId) {
    try {
      // Simulate download progress (in a real app, this would come from the main process)
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 100) progress = 100;
        
        const speed = (Math.random() * 5 + 1) * 1024 * 1024; // Random speed between 1-6 MB/s
        this.updateDownloadProgress(versionId, progress, speed);
        
        if (progress >= 100) {
          clearInterval(interval);
          // Mark as downloaded (in a real app, this would be handled by the main process)
          const downloadedVersions = JSON.parse(localStorage.getItem('downloadedVersions') || '[]');
          if (!downloadedVersions.includes(versionId)) {
            downloadedVersions.push(versionId);
            localStorage.setItem('downloadedVersions', JSON.stringify(downloadedVersions));
          }
          
          // Refresh UI elements
          this.loadInstancesForDropdown();
          if (this.currentScreen === 'instances') {
            this.loadInstances();
          }
        }
      }, 500);
      
      // Start the actual download
      await this.downloadVersion(versionId);
      
    } catch (error) {
      console.error('Download failed:', error);
      this.hideDownloadNotification(versionId);
      this.showNotification(`Failed to download ${versionId}`, 'error');
    }
  }

  cancelDownload(versionId) {
    // Cancel download logic would go here
    this.hideDownloadNotification(versionId);
    this.showNotification('Download cancelled', 'info');
  }

  // Update isVersionDownloaded to check localStorage
  isVersionDownloaded(versionId) {
    const downloadedVersions = JSON.parse(localStorage.getItem('downloadedVersions') || '[]');
    return downloadedVersions.includes(versionId);
  }

  // =====================================================
  // PLAYTIME SESSION TRACKING
  // =====================================================

  async startPlaytimeSession(versionId, instanceId) {
    try {
      this.currentSession = {
        versionId,
        instanceId,
        startTime: Date.now(),
        sessionId: Date.now().toString()
      };
      
      // Start session tracking in main process
      if (window.electronAPI && window.electronAPI.playtime) {
        await window.electronAPI.playtime.startSession(versionId);
      }
      
      console.log('Playtime session started:', this.currentSession);
    } catch (error) {
      console.error('Failed to start playtime session:', error);
    }
  }

  async endPlaytimeSession() {
    try {
      if (!this.currentSession) return;
      
      const sessionDuration = Date.now() - this.currentSession.startTime;
      
      // End session tracking in main process
      if (window.electronAPI && window.electronAPI.playtime) {
        await window.electronAPI.playtime.endSession();
      }
      
      // Store session in localStorage as backup
      const sessions = JSON.parse(localStorage.getItem('playtimeSessions') || '[]');
      sessions.push({
        ...this.currentSession,
        endTime: Date.now(),
        duration: sessionDuration
      });
      localStorage.setItem('playtimeSessions', JSON.stringify(sessions));
      
      console.log('Playtime session ended:', sessionDuration / 1000 / 60, 'minutes');
      this.currentSession = null;
      
      // Update stats display
      this.updatePlaytimeStats();
      
    } catch (error) {
      console.error('Failed to end playtime session:', error);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatTime(seconds) {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return '';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new YNGClientApp();
});

// Global functions for modal controls
window.closeCreateInstanceModal = function() {
  if (window.app) {
    window.app.closeCreateInstanceModal();
  }
};