const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const MinecraftManager = require('./minecraft-manager');

class LauncherManager {
  constructor() {
    this.minecraftManager = new MinecraftManager();
    this.runningProcesses = new Map();
  }

  async launchMinecraft(options) {
    try {
      const { version, gameDirectory, memory, user } = options;
      
      console.log(`Launching Minecraft ${version}...`);
      
      // Validate inputs
      if (!version || !user) {
        throw new Error('Version and user are required');
      }

      // Get version JSON
      const versionJson = await this.minecraftManager.getVersionJson(version);
      
      // Setup game directory
      const gameDir = gameDirectory || path.join(os.homedir(), '.minecraft');
      await fs.ensureDir(gameDir);
      
      // Build launch arguments
      const javaPath = await this.findJavaExecutable();
      const launchArgs = await this.buildLaunchArguments(versionJson, gameDir, memory, user);
      
      console.log('Java path:', javaPath);
      console.log('Launch arguments:', launchArgs.join(' '));
      
      // Launch the game
      const gameProcess = spawn(javaPath, launchArgs, {
        cwd: gameDir,
        stdio: 'inherit'
      });

      // Store process reference
      const processId = `minecraft_${version}_${Date.now()}`;
      this.runningProcesses.set(processId, gameProcess);
      
      // Handle process events
      gameProcess.on('error', (error) => {
        console.error('Game process error:', error);
        this.runningProcesses.delete(processId);
      });

      gameProcess.on('exit', (code, signal) => {
        console.log(`Game process exited with code ${code}, signal ${signal}`);
        this.runningProcesses.delete(processId);
      });

      return { 
        success: true, 
        processId: processId,
        message: 'Minecraft launched successfully'
      };
      
    } catch (error) {
      console.error('Launch error:', error);
      throw error;
    }
  }

  async buildLaunchArguments(versionJson, gameDir, memory, user) {
    const args = [];
    
    // JVM arguments
    args.push(`-Xmx${memory}M`);
    args.push(`-Xms${Math.min(512, memory)}M`);
    
    // Native library path
    const nativesDir = await this.extractNatives(versionJson, gameDir);
    args.push(`-Djava.library.path=${nativesDir}`);
    
    // Classpath
    const classpath = await this.buildClasspath(versionJson);
    args.push('-cp', classpath);
    
    // Additional JVM arguments from version JSON
    if (versionJson.arguments && versionJson.arguments.jvm) {
      const jvmArgs = this.processArguments(versionJson.arguments.jvm, {
        auth_player_name: user.name,
        version_name: versionJson.id,
        game_directory: gameDir,
        assets_root: path.join(os.homedir(), '.minecraft', 'assets'),
        assets_index_name: versionJson.assetIndex ? versionJson.assetIndex.id : 'legacy',
        auth_uuid: user.id,
        auth_access_token: 'dummy', // We don't need the actual token for offline play
        user_type: 'msa',
        version_type: versionJson.type,
        natives_directory: nativesDir,
        launcher_name: 'YNG-Client',
        launcher_version: '1.0.0',
        classpath: classpath
      });
      args.push(...jvmArgs);
    }
    
    // Main class
    args.push(versionJson.mainClass);
    
    // Game arguments
    if (versionJson.arguments && versionJson.arguments.game) {
      const gameArgs = this.processArguments(versionJson.arguments.game, {
        auth_player_name: user.name,
        version_name: versionJson.id,
        game_directory: gameDir,
        assets_root: path.join(os.homedir(), '.minecraft', 'assets'),
        assets_index_name: versionJson.assetIndex ? versionJson.assetIndex.id : 'legacy',
        auth_uuid: user.id,
        auth_access_token: 'dummy',
        user_type: 'msa',
        version_type: versionJson.type
      });
      args.push(...gameArgs);
    } else {
      // Fallback for older versions
      const legacyArgs = [
        '--username', user.name,
        '--version', versionJson.id,
        '--gameDir', gameDir,
        '--assetsDir', path.join(os.homedir(), '.minecraft', 'assets'),
        '--assetIndex', versionJson.assetIndex ? versionJson.assetIndex.id : 'legacy',
        '--uuid', user.id,
        '--accessToken', 'dummy',
        '--userType', 'msa',
        '--versionType', versionJson.type
      ];
      args.push(...legacyArgs);
    }
    
    return args;
  }

  processArguments(argumentsList, variables) {
    const processedArgs = [];
    
    for (const arg of argumentsList) {
      if (typeof arg === 'string') {
        processedArgs.push(this.replaceVariables(arg, variables));
      } else if (typeof arg === 'object' && arg.rules) {
        // Check if this argument should be included based on rules
        let shouldInclude = true;
        
        for (const rule of arg.rules) {
          if (rule.action === 'disallow') {
            if (!rule.os || this.matchesCurrentOS(rule.os)) {
              shouldInclude = false;
              break;
            }
          }
        }
        
        if (shouldInclude && arg.value) {
          if (Array.isArray(arg.value)) {
            for (const value of arg.value) {
              processedArgs.push(this.replaceVariables(value, variables));
            }
          } else {
            processedArgs.push(this.replaceVariables(arg.value, variables));
          }
        }
      }
    }
    
    return processedArgs;
  }

  replaceVariables(str, variables) {
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return variables[varName] || match;
    });
  }

  matchesCurrentOS(osRule) {
    const currentOS = os.platform();
    
    if (osRule.name) {
      switch (osRule.name) {
        case 'windows':
          return currentOS === 'win32';
        case 'osx':
          return currentOS === 'darwin';
        case 'linux':
          return currentOS === 'linux';
        default:
          return false;
      }
    }
    
    return false;
  }

  async buildClasspath(versionJson) {
    const classpathEntries = [];
    
    // Add libraries
    if (versionJson.libraries) {
      for (const library of versionJson.libraries) {
        if (this.shouldIncludeLibrary(library)) {
          const libraryPath = this.getLibraryPath(library);
          if (await fs.pathExists(libraryPath)) {
            classpathEntries.push(libraryPath);
          }
        }
      }
    }
    
    // Add client JAR
    const clientJarPath = this.minecraftManager.getClientJarPath(versionJson.id);
    classpathEntries.push(clientJarPath);
    
    // Join with platform-specific separator
    const separator = os.platform() === 'win32' ? ';' : ':';
    return classpathEntries.join(separator);
  }

  shouldIncludeLibrary(library) {
    if (library.rules) {
      for (const rule of library.rules) {
        if (rule.action === 'disallow') {
          if (!rule.os || this.matchesCurrentOS(rule.os)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  getLibraryPath(library) {
    if (library.downloads && library.downloads.artifact) {
      return path.join(os.homedir(), '.minecraft', 'libraries', library.downloads.artifact.path);
    }
    
    // Fallback for older format
    const [group, name, version] = library.name.split(':');
    const groupPath = group.replace(/\./g, '/');
    const fileName = `${name}-${version}.jar`;
    return path.join(os.homedir(), '.minecraft', 'libraries', groupPath, name, version, fileName);
  }

  async extractNatives(versionJson, gameDir) {
    const nativesDir = path.join(gameDir, 'natives');
    await fs.ensureDir(nativesDir);
    
    // This is a simplified implementation
    // In a full implementation, you would extract native libraries from JARs
    // For now, we'll just return the directory path
    
    return nativesDir;
  }

  async findJavaExecutable() {
    const platform = os.platform();
    
    // Try to find Java in common locations
    const javaExecutables = [];
    
    if (platform === 'win32') {
      javaExecutables.push(
        'java.exe',
        'C:\\Program Files\\Java\\jre8\\bin\\java.exe',
        'C:\\Program Files\\Java\\jdk-8\\bin\\java.exe',
        'C:\\Program Files (x86)\\Java\\jre8\\bin\\java.exe'
      );
    } else {
      javaExecutables.push(
        'java',
        '/usr/bin/java',
        '/usr/local/bin/java',
        '/System/Library/Frameworks/JavaVM.framework/Versions/Current/Commands/java'
      );
    }
    
    // Check if Java is in PATH
    for (const javaPath of javaExecutables) {
      try {
        if (await this.testJavaExecutable(javaPath)) {
          return javaPath;
        }
      } catch (error) {
        // Continue to next option
      }
    }
    
    // If nothing found, return 'java' and hope it's in PATH
    return 'java';
  }

  async testJavaExecutable(javaPath) {
    return new Promise((resolve) => {
      const testProcess = spawn(javaPath, ['-version'], { stdio: 'pipe' });
      
      let output = '';
      testProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.on('close', (code) => {
        resolve(code === 0 && output.includes('version'));
      });
      
      testProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  killProcess(processId) {
    const process = this.runningProcesses.get(processId);
    if (process) {
      process.kill();
      this.runningProcesses.delete(processId);
      return { success: true };
    }
    return { success: false, error: 'Process not found' };
  }

  getRunningProcesses() {
    return Array.from(this.runningProcesses.keys());
  }
}

module.exports = LauncherManager;