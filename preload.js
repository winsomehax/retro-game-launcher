const { contextBridge, ipcRenderer } = require('electron');

// Validate data types for basic authorization
const validateDataType = (dataType) => {
  const validTypes = ['games', 'platforms', 'emulators', 'tags', 'settings'];
  return validTypes.includes(dataType);
};

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatforms: () => ipcRenderer.invoke('get-platforms'),
  loadData: (dataType) => validateDataType(dataType) ? ipcRenderer.invoke('load-data', dataType) : Promise.reject('Invalid data type'),
  saveData: (dataType, data) => validateDataType(dataType) ? ipcRenderer.invoke('save-data', dataType, data) : Promise.reject('Invalid data type'),
  getPlatformMedia: (platformId) => ipcRenderer.invoke('get-platform-media', platformId),
  queryDataSources: (platformName, tagNames) => ipcRenderer.invoke('query-data-sources', platformName, tagNames),
  scanFolder: () => ipcRenderer.invoke('scan-folder'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  queryGeminiTitle: (romName) => ipcRenderer.invoke('queryGeminiTitle', romName),
  queryGeminiTitlesBatch: (romNames, platformName) => ipcRenderer.invoke('queryGeminiTitlesBatch', romNames, platformName),
  queryGeminiGameTags: (gameName, platformName, existingTags) => ipcRenderer.invoke('queryGeminiGameTags', gameName, platformName, existingTags),
  searchGameOnScreenScraper: (platformId, gameName) => ipcRenderer.invoke('search-game-on-screenscraper', platformId, gameName),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  launchGame: (launchConfig) => ipcRenderer.invoke('launch-game', launchConfig),
  getAssetPath: (url) => ipcRenderer.invoke('get-asset-path', url),
  discoverEmulators: () => ipcRenderer.invoke('discover-emulators')
});

// Add event listener for emulator discovery progress
ipcRenderer.on('emulator-discovery-progress', (_, message) => {
  if (window.handleEmulatorDiscoveryProgress) {
    window.handleEmulatorDiscoveryProgress(message);
  }
});
