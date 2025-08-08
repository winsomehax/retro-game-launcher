const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatforms: () => ipcRenderer.invoke('get-platforms'),
  loadData: (dataType) => ipcRenderer.invoke('load-data', dataType),
  saveData: (dataType, data) => ipcRenderer.invoke('save-data', dataType, data),
  getPlatformMedia: (platformId) => ipcRenderer.invoke('get-platform-media', platformId),
  queryDataSources: (platformName) => ipcRenderer.invoke('query-data-sources', platformName),
  scanFolder: () => ipcRenderer.invoke('scan-folder'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  queryGeminiTitle: (romName) => ipcRenderer.invoke('queryGeminiTitle', romName),
  queryGeminiTitlesBatch: (romNames, platformName) => ipcRenderer.invoke('queryGeminiTitlesBatch', romNames, platformName),
  searchGameOnScreenScraper: (platformId, gameName) => ipcRenderer.invoke('search-game-on-screenscraper', platformId, gameName),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  launchGame: (launchConfig) => ipcRenderer.invoke('launch-game', launchConfig)
});
