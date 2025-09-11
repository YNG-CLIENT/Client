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
      case 'downloads':
        this.initializeDownloadsScreen();
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
    this.updateVersionCards();
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
    
    card.innerHTML = `
      <div class="version-header">
        <div class="version-info">
          <h4 class="version-name">${version.id}</h4>
          <span class="version-type">${typeIcon} ${version.type}</span>
          ${downloadStatus.isDownloading ? `<span class="download-status downloading">⬇️ Downloading</span>` : ''}
          ${isDownloaded ? `<span class="download-status downloaded">✅ Downloaded</span>` : ''}
        </div>
        <div class="version-actions">
          ${this.createVersionActionButtons(version.id, downloadStatus, isDownloaded)}
        </div>
      </div>
      <div class="version-details">
        <span class="release-date">Released: ${releaseDate}</span>
        <span class="version-size">Size: ~${this.estimateVersionSize(version.type)}</span>
      </div>
      ${downloadStatus.isDownloading ? this.createVersionProgressBar(downloadStatus.progress) : ''}
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
      this.showNotification(`Downloading Minecraft ${versionId}...`, 'info');
      await window.electronAPI.discord.setDownloadActivity(versionId, 0);
      
      // Use the enhanced download method with progress tracking
      const result = await this.downloadVersionWithProgress(versionId);
      
      if (result.success) {
        this.showNotification(`Minecraft ${versionId} downloaded successfully!`, 'success');
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
      // Get default game directory
      const defaultGameDir = await window.electronAPI.minecraft.getDefaultDirectory();
      
      const launchOptions = {
        version: versionId || this.selectedVersion,
        user: {
          name: this.currentUser.name || 'Player',
          id: this.currentUser.id || 'offline-uuid',
          accessToken: this.currentUser.accessToken || 'offline-token',
          isOffline: this.currentUser.isOffline || false
        },
        gameDirectory: this.settings.gameDirectory || defaultGameDir,
        javaArgs: this.settings.javaArgs || [],
        memory: this.settings.memory || 2048
      };

      this.showNotification('Launching Minecraft...', 'info');
      
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
    console.log('Download progress update:', progress);
    
    // Update any active progress bars
    const progressBars = document.querySelectorAll('.download-progress');
    const progressTexts = document.querySelectorAll('.download-text');
    
    progressBars.forEach(bar => {
      bar.style.width = `${progress.percentage}%`;
    });
    
    progressTexts.forEach(text => {
      text.textContent = `${progress.message}: ${progress.percentage}%`;
    });
    
    // Update version cards if they show download progress
    const versionCards = document.querySelectorAll('.version-card');
    versionCards.forEach(card => {
      const progressBar = card.querySelector('.version-progress-fill');
      const progressText = card.querySelector('.progress-text');
      
      if (progressBar) {
        progressBar.style.width = `${progress.percentage}%`;
      }
      
      if (progressText) {
        progressText.textContent = `${progress.percentage}%`;
      }
    });
    
    // Update active downloads in downloads screen
    this.updateActiveDownloadsList();
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

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new YNGClientApp();
});