# YNG Client 🎮

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-blue)](https://github.com/YNG-CLIENT/YNG-Client)
[![Electron](https://img.shields.io/badge/Electron-27.0.0-green)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-brightgreen)](https://nodejs.org/)

> **A modern, free open-source Minecraft launcher for Windows and Linux**

YNG Client is a sleek, modern Minecraft launcher built with Electron and Node.js. Featuring Microsoft OAuth2 authentication, automatic version management, and a flashy, clean interface that rivals commercial Minecraft clients. Built by the community, for the community.

## ✨ Features

### 🔐 **Secure Authentication**
- Microsoft OAuth2 integration for official Minecraft accounts
- Offline mode for development and testing
- Secure token storage and management

### 🎯 **Version Management**
- Automatic Minecraft version detection and downloading
- Support for Release, Snapshot, and Beta versions
- Smart caching and update system
- One-click version switching

### ⚡ **Performance & Customization**
- Configurable Java memory allocation (up to 16GB)
- Custom JVM arguments support
- Optimized game directory management
- Background downloads with progress tracking

### 🎨 **Modern Interface**
- **Flashy, clean design** with animated backgrounds
- **Sidebar navigation** with smooth transitions
- **Glassmorphism effects** and modern card layouts
- **Platform support indicators** (Windows ✅, Linux ✅, macOS ⏳)
- **Real-time notifications** and progress tracking

### 🌐 **Cross-Platform Support**
- **Windows** ✅ Full support
- **Linux** ✅ Full support  
- **macOS** ⏳ Maybe in the future (but Mac is the worst OS 😉)

## 🚀 Quick Start
## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Java 8+ (for Minecraft)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YNG-CLIENT/YNG-Client.git
   cd YNG-Client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

### Building from Source

```bash
# For Windows
npm run build:win

# For Linux  
npm run build:linux

# For all platforms
npm run build
```

## 🎮 How to Use

### First Launch
1. **Login**: Click "Sign in with Microsoft" to authenticate with your Minecraft account
2. **Select Version**: Choose your preferred Minecraft version from the dropdown
3. **Configure Settings**: Adjust memory allocation and game directory if needed
4. **Launch**: Click the "Launch Minecraft" button to start playing!

### Navigation
- **🏠 Home**: Quick launch with version selector and user profile
- **📦 Versions**: Browse and manage all Minecraft versions
- **⚙️ Settings**: Configure memory, Java args, and directories
- **ℹ️ About**: View launcher info and feature details

## 🛠️ Configuration

### Game Settings
- **Memory Allocation**: Adjust RAM usage (512MB - 16GB)
- **Java Arguments**: Add custom JVM parameters
- **Game Directory**: Choose where Minecraft files are stored
- **Version Filtering**: Show/hide snapshots and beta versions

### Launcher Settings
- **Keep Launcher Open**: Option to close launcher when game starts
- **Auto Updates**: Automatic launcher update notifications
- **Authentication**: Microsoft OAuth2 or offline mode

## 🏗️ Development

### Project Structure
```
YNG Client/
├── src/
│   ├── main/                 # Main Electron process
│   │   ├── auth-manager.js   # Microsoft OAuth2 authentication
│   │   ├── minecraft-manager.js # Version management & downloads
│   │   └── launcher-manager.js  # Game launching logic
│   └── renderer/             # Frontend interface
│       ├── index.html        # Modern UI with sidebar navigation
│       ├── styles.css        # Flashy CSS with animations
│       └── app.js           # Frontend application logic
├── package.json
└── README.md
```

### Technology Stack
- **Frontend**: HTML5, CSS3 (Grid/Flexbox, Custom Properties, Animations), Vanilla JavaScript
- **Backend**: Electron 27.0.0, Node.js 20.x
- **Authentication**: Microsoft Identity Platform (OAuth2)
- **Design**: Inter font, Glassmorphism, Dark theme, Gradient backgrounds

## 🐛 Troubleshooting

### Common Issues

**GPU Process Crashes on Windows**
- The launcher includes automatic workarounds for GPU-related crashes
- If issues persist, try updating your graphics drivers

**Authentication Fails**
- Ensure you have a valid Minecraft account
- Check your internet connection
- Try restarting the launcher

**Game Won't Launch**
- Verify Java is installed and accessible
- Check game directory permissions
- Ensure sufficient disk space for downloads

## 🤝 Contributing

We welcome contributions from the community! This is a **free, open-source project** built for everyone.

### How to Contribute
- 🐛 Report bugs on [GitHub Issues](https://github.com/YNG-CLIENT/YNG-Client/issues)
- 💡 Suggest features and improvements
- 🔧 Submit pull requests for bug fixes or new features
- 📚 Help improve documentation
- 🎨 Contribute UI/UX improvements

### Development
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the **MIT License** - completely free and open-source.

## 🙏 Acknowledgments

- **Mojang Studios** for creating Minecraft
- **Microsoft** for Xbox Live authentication services
- **Electron** team for the cross-platform framework
- **Open Source Community** for inspiration and support

---

<div align="center">
  <p><strong>🎮 YNG Client - Free Open Source Minecraft Launcher 🎮</strong></p>
  <p><em>Built with ❤️ for the Minecraft community</em></p>
  <p><strong>Windows ✅ | Linux ✅ | macOS ⏳</strong></p>
</div>
```

### Linux
```bash
npm run build-linux
```

### All Platforms
```bash
npm run build
```

Built applications will be available in the `dist` folder.

## Project Structure

```
yng-client/
├── src/
│   ├── main.js                 # Main Electron process
│   ├── main/                   # Backend modules
│   │   ├── auth-manager.js     # Microsoft/Xbox authentication
│   │   ├── minecraft-manager.js # Version and asset management
│   │   └── launcher-manager.js  # Game launching logic
│   └── renderer/               # Frontend UI
│       ├── index.html          # Main UI
│       ├── styles.css          # UI styling
│       ├── app.js             # Frontend logic
│       └── preload.js         # Electron preload script
├── assets/                     # Application assets
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Configuration

The launcher stores configuration and authentication data in:
- **Windows**: `%USERPROFILE%\.yng-client\`
- **macOS**: `~/.yng-client/`
- **Linux**: `~/.yng-client/`

Minecraft game files are stored in the standard `.minecraft` directory unless changed in settings.

## Authentication

**Current Status: Demo Mode**

YNG Client is currently running in demo mode for authentication. To implement real Microsoft OAuth2 authentication:

### Setting up Real Microsoft Authentication

1. **Register your application** in the [Azure Portal](https://portal.azure.com):
   - Go to "App registrations" and create a new registration
   - Name: "YNG Client" (or your preferred name)
   - Supported account types: "Personal Microsoft accounts only"
   - Redirect URI: Select "Mobile and desktop applications" and enter `https://login.live.com/oauth20_desktop.srf`

2. **Configure API permissions**:
   - Add "Xbox Live" permissions (User.Read)
   - Add "Microsoft Graph" permissions (User.Read)
   - Grant admin consent if required

3. **Update the code**:
   - Replace the `clientId` in `src/main/auth-manager.js` with your Application (client) ID
   - Uncomment the real authentication methods
   - Remove the demo authentication code

### Demo Mode Features

In demo mode, the launcher will:
- Show a demo player account
- Allow you to test all other features (version downloading, launching)
- Use placeholder authentication tokens

### Production Authentication Flow

When properly configured, YNG Client uses the official Microsoft OAuth2 flow:
1. User clicks "Sign in with Microsoft"
2. Opens Microsoft login page in secure browser window
3. User authenticates with Microsoft account
4. Tokens are exchanged for Xbox Live authentication
5. Xbox Live tokens are used to authenticate with Minecraft services
6. User profile and authentication tokens are stored securely

## Troubleshooting

### Java Not Found
If you get "Java not found" errors:
1. Install Java 8 or higher
2. Ensure Java is in your system PATH
3. On Windows, you may need to set the `JAVA_HOME` environment variable

### Authentication Issues
If login fails:
1. Check your internet connection
2. Ensure your Microsoft account owns Minecraft
3. Try logging out and back in
4. Clear authentication data from `~/.yng-client/auth.json`

### Download Issues
If version downloads fail:
1. Check your internet connection
2. Ensure you have sufficient disk space
3. Try refreshing the version list
4. Check firewall settings

## Development

To contribute to YNG Client:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple platforms
5. Submit a pull request

### Code Structure

- **Main Process** (`src/main.js`): Handles app lifecycle and IPC
- **Auth Manager**: Microsoft/Xbox Live authentication flow
- **Minecraft Manager**: Version manifest, downloads, and asset management
- **Launcher Manager**: Game launching with proper JVM arguments
- **Renderer Process**: UI and user interactions

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Disclaimer

YNG Client is an unofficial Minecraft launcher. Minecraft is a trademark of Mojang AB and Microsoft Corporation. This project is not affiliated with or endorsed by Mojang AB or Microsoft Corporation.

## Support

For issues and support:
1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information about your problem

---

Built with ❤️ for the Minecraft community