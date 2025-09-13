
# 🚨 ALPHA Release – Still in Development 🚨

# YNG Client 🎮

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-blue)](https://github.com/YNG-Client/Client)
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

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Java 8+ (for Minecraft)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YNG-Client/Client.git
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
- 🐛 Report bugs on [GitHub Issues](https://github.com/YNG-Client/Client/issues)
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
### FAQ

- **Why Would We Need ANOTHER client?** You don't you should **NOT** need another client VS the base minecraft client.... BUT microsoft dose not care about the looks or performance even MOST major clients don't saying Hey! Let me spend 20$ for a FUCKING CAPE.
 - **How can the client be open source BUT Connect to the YNG Client API?** We care about security and have the API source code limited to 2 people [@KoopaCode](https://github.com/KoopaCode) & [@iakzs](https://github.com/iakzs) you connect to it using our API url setup via the /src/main/src/main/config.js file! 
 - **Will the API ever be open source?** Depends aslong as we continue the development we **WONT** release the source for the API. If the development ever stops we **WILL** release the API & or update the client to have the API built in & or make it setup to play without the API
 - **Can I OPT out of using the YNG API?** Kinda? We are working on making a documentation so YOU can create you're OWN api! and set the new API endpoint in the settings tab. We plan to setup a OPT out of auto updates and YNG Client API option SOON!
 - **How do the YNG Client Capes work?** We create capes on our [Appwrite](https://appwrite.io/) DB and upload to there bucket and the client will check if the signed in user was granted the said cape!
 - **What DO we store in our API?** We Store 1. UUID 2. Username 3. Granted Capes 4, Client Version! Everything else is disgraded and not synced to our [Appwrite](https://appwrite.io/)

   
---

<div align="center">
  <p><strong>🎮 YNG Client - Free Open Source Minecraft Launcher 🎮</strong></p>
  <p><em>Built with ❤️ for the Minecraft community</em></p>
  <p><strong>Windows ✅ | Linux ✅ | macOS ⏳</strong></p>
</div>
