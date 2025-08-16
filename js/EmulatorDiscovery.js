const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class EmulatorDiscovery {
    constructor() {
        this.supportedEmulators = {
            'mednafen': {
                name: 'Mednafen',
                platforms: ['nes', 'snes', 'gba', 'gb', 'gbc'],
                packageNames: ['mednafen']
            },
            'retroarch': {
                name: 'RetroArch',
                platforms: ['nes', 'snes', 'gba', 'gb', 'gbc', 'genesis', 'n64', 'psx'],
                packageNames: ['retroarch']
            },
            'desmume': {
                name: 'DeSmuME',
                platforms: ['nds'],
                packageNames: ['desmume']
            },
            'pcsx2': {
                name: 'PCSX2',
                platforms: ['ps2'],
                packageNames: ['pcsx2']
            },
            'duckstation': {
                name: 'DuckStation',
                platforms: ['ps1'],
                packageNames: ['duckstation']
            },
            citra: {
                name: 'Citra',
                platforms: ['n64'],
                packageNames: ['citra']
            },
            PPSSPP: {
                name: 'PPSSPP',
                platforms: ['psp'],
                packageNames: ['ppsspp']
            },
            ryujinx: {
                name: 'Ryujinx',
                platforms: ['switch'],
                packageNames: ['ryujinx']
            },
            yuzu: {
                name: 'Yuzu',
                platforms: ['switch'],
                packageNames: ['yuzu']
            },
            flycast: {
                name: 'Flycast',
                platforms: ['dreamcast'],
                packageNames: ['flycast']
            },
            'mupen64plus': {
                name: 'Mupen64Plus',
                platforms: ['n64'],
                packageNames: ['mupen64plus']
            }
        };
    }

    /**
     * Discover emulators installed via package managers
     */
    async discoverPackageEmulators(progressCallback = null) {
        const emulators = [];
        
        // Check APT (Debian/Ubuntu)
        if (this.isCommandAvailable('dpkg')) {
            if (progressCallback) progressCallback('Checking APT packages...');
            emulators.push(...await this.discoverAptEmulators());
        }
        
        // Check Pacman (Arch)
        if (this.isCommandAvailable('pacman')) {
            if (progressCallback) progressCallback('Checking Pacman packages...');
            emulators.push(...await this.discoverPacmanEmulators());
        }
        
        // Check DNF (Fedora)
        if (this.isCommandAvailable('dnf')) {
            if (progressCallback) progressCallback('Checking DNF packages...');
            emulators.push(...await this.discoverDnfEmulators());
        }
        
        return emulators;
    }

    /**
     * Discover emulators installed via Flatpak
     */
    async discoverFlatpakEmulators() {
        const emulators = [];
        
        if (!this.isCommandAvailable('flatpak')) {
            return emulators;
        }
        
        try {
            const output = execSync('flatpak list --app --columns=application,name', { encoding: 'utf-8' });
            const lines = output.split('\n');
            
            for (const line of lines) {
                if (!line.trim()) continue;
                
                const [appId, name] = line.split('\t');
                
                // Check if this is a known emulator
                for (const [key, emulator] of Object.entries(this.supportedEmulators)) {
                    if (name.toLowerCase().includes(key) || appId.toLowerCase().includes(key)) {
                        emulators.push({
                            id: this.generateUUID(),
                            name: emulator.name,
                            executablePath: `flatpak run ${appId}`,
                            installationType: 'flatpak',
                            flatpakInfo: {
                                appId: appId,
                                name: name
                            },
                            supportedPlatforms: emulator.platforms,
                            args: ''
                        });
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error discovering Flatpak emulators:', error);
        }
        
        return emulators;
    }

    /**
     * Discover emulators installed via Snap
     */
    async discoverSnapEmulators() {
        const emulators = [];
        
        if (!this.isCommandAvailable('snap')) {
            return emulators;
        }
        
        try {
            const output = execSync('snap list', { encoding: 'utf-8' });
            const lines = output.split('\n');
            
            for (const line of lines) {
                if (!line.trim() || line.startsWith('Name')) continue;
                
                const parts = line.split(/\s+/);
                const snapName = parts[0];
                
                // Check if this is a known emulator
                for (const [key, emulator] of Object.entries(this.supportedEmulators)) {
                    if (snapName.toLowerCase().includes(key)) {
                        emulators.push({
                            id: this.generateUUID(),
                            name: emulator.name,
                            executablePath: `snap run ${snapName}`,
                            installationType: 'snap',
                            snapInfo: {
                                name: snapName
                            },
                            supportedPlatforms: emulator.platforms,
                            args: ''
                        });
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error discovering Snap emulators:', error);
        }
        
        return emulators;
    }

    /**
     * Discover emulators in common directories
     */
    async discoverDirectoryEmulators() {
        const emulators = [];
        const searchPaths = [
            '/usr/bin',
            '/usr/local/bin',
            path.join(require('os').homedir(), '.local/bin'),
            '/opt'
        ];
        
        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
                try {
                    const files = fs.readdirSync(searchPath);
                    
                    for (const file of files) {
                        // Check if this is a known emulator
                        for (const [key, emulator] of Object.entries(this.supportedEmulators)) {
                            if (file.toLowerCase() === key) {
                                const fullPath = path.join(searchPath, file);
                                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                                    emulators.push({
                                        id: this.generateUUID(),
                                        name: emulator.name,
                                        executablePath: fullPath,
                                        installationType: 'source',
                                        supportedPlatforms: emulator.platforms,
                                        args: ''
                                    });
                                    break;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error scanning directory ${searchPath}:`, error);
                }
            }
        }
        
        return emulators;
    }

    /**
     * Discover APT installed emulators
     */
    async discoverAptEmulators() {
        const emulators = [];
        
        try {
            for (const [key, emulator] of Object.entries(this.supportedEmulators)) {
                for (const packageName of emulator.packageNames) {
                    try {
                        // Check if package is installed
                        execSync(`dpkg -l ${packageName}`, { stdio: 'ignore' });
                        
                        // Get package files
                        const filesOutput = execSync(`dpkg -L ${packageName}`, { encoding: 'utf-8' });
                        const files = filesOutput.split('\n');
                        
                        // Find binary files
                        const binaryFiles = files.filter(file => 
                            file.startsWith('/usr/bin/') || file.startsWith('/usr/games/')
                        );
                        
                        if (binaryFiles.length > 0) {
                            emulators.push({
                                id: this.generateUUID(),
                                name: emulator.name,
                                executablePath: binaryFiles[0],
                                installationType: 'package',
                                packageInfo: {
                                    manager: 'apt',
                                    packageName: packageName
                                },
                                supportedPlatforms: emulator.platforms,
                                args: ''
                            });
                            break;
                        }
                    } catch (error) {
                        // Package not installed, continue to next
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error('Error discovering APT emulators:', error);
        }
        
        return emulators;
    }

    /**
     * Discover Pacman installed emulators
     */
    async discoverPacmanEmulators() {
        const emulators = [];
        
        try {
            for (const [key, emulator] of Object.entries(this.supportedEmulators)) {
                for (const packageName of emulator.packageNames) {
                    try {
                        // Check if package is installed
                        execSync(`pacman -Q ${packageName}`, { stdio: 'ignore' });
                        
                        // Get package files
                        const filesOutput = execSync(`pacman -Ql ${packageName}`, { encoding: 'utf-8' });
                        const files = filesOutput.split('\n');
                        
                        // Find binary files
                        const binaryFiles = files
                            .map(line => line.split(' ')[1])
                            .filter(file => file && (file.startsWith('/usr/bin/') || file.startsWith('/usr/games/')));
                        
                        if (binaryFiles.length > 0) {
                            emulators.push({
                                id: this.generateUUID(),
                                name: emulator.name,
                                executablePath: binaryFiles[0],
                                installationType: 'package',
                                packageInfo: {
                                    manager: 'pacman',
                                    packageName: packageName
                                },
                                supportedPlatforms: emulator.platforms,
                                args: ''
                            });
                            break;
                        }
                    } catch (error) {
                        // Package not installed, continue to next
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error('Error discovering Pacman emulators:', error);
        }
        
        return emulators;
    }

    /**
     * Discover DNF installed emulators
     */
    async discoverDnfEmulators() {
        const emulators = [];
        
        try {
            for (const [key, emulator] of Object.entries(this.supportedEmulators)) {
                for (const packageName of emulator.packageNames) {
                    try {
                        // Check if package is installed
                        execSync(`rpm -q ${packageName}`, { stdio: 'ignore' });
                        
                        // Get package files
                        const filesOutput = execSync(`rpm -ql ${packageName}`, { encoding: 'utf-8' });
                        const files = filesOutput.split('\n');
                        
                        // Find binary files
                        const binaryFiles = files.filter(file => 
                            file.startsWith('/usr/bin/') || file.startsWith('/usr/games/')
                        );
                        
                        if (binaryFiles.length > 0) {
                            emulators.push({
                                id: this.generateUUID(),
                                name: emulator.name,
                                executablePath: binaryFiles[0],
                                installationType: 'package',
                                packageInfo: {
                                    manager: 'dnf',
                                    packageName: packageName
                                },
                                supportedPlatforms: emulator.platforms,
                                args: ''
                            });
                            break;
                        }
                    } catch (error) {
                        // Package not installed, continue to next
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error('Error discovering DNF emulators:', error);
        }
        
        return emulators;
    }

    /**
     * Check if a command is available
     */
    isCommandAvailable(command) {
        try {
            execSync(`which ${command}`, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate a UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Discover all emulators
     */
    async discoverAllEmulators(progressCallback = null) {
        const allEmulators = [];
        
        // Discover from different sources
        if (progressCallback) progressCallback('Checking package managers...');
        allEmulators.push(...await this.discoverPackageEmulators());
        
        if (progressCallback) progressCallback('Checking Flatpak...');
        allEmulators.push(...await this.discoverFlatpakEmulators());
        
        if (progressCallback) progressCallback('Checking Snap...');
        allEmulators.push(...await this.discoverSnapEmulators());
        
        if (progressCallback) progressCallback('Scanning directories...');
        allEmulators.push(...await this.discoverDirectoryEmulators());
        
        if (progressCallback) progressCallback('Removing duplicates...');
        
        // Remove duplicates based on executable path
        const uniqueEmulators = [];
        const seenPaths = new Set();
        
        for (const emulator of allEmulators) {
            if (!seenPaths.has(emulator.executablePath)) {
                seenPaths.add(emulator.executablePath);
                uniqueEmulators.push(emulator);
            }
        }
        
        return uniqueEmulators;
    }
}

module.exports = EmulatorDiscovery;