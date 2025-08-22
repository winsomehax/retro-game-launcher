const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GameService = require('./js/GameService'); // Import GameService
const AssetManager = require('./js/AssetManager'); // Import AssetManager
const EmulatorDiscovery = require('./js/EmulatorDiscovery'); // Import EmulatorDiscovery

require('dotenv').config();

// Debug output to check if environment variables are loaded
console.log('SCREENSCRAPER_DEVID:', process.env.SCREENSCRAPER_DEVID);
console.log('SCREENSCRAPER_DEV_PASSWORD:', process.env.SCREENSCRAPER_DEV_PASSWORD ? '***' : 'NOT SET');


const gs = new GameService(process.env.SCREENSCRAPER_DEVID, process.env.SCREENSCRAPER_DEV_PASSWORD); // Initialize GameService with credentials
const assetManager = new AssetManager(); // Initialize AssetManager
const emulatorDiscovery = new EmulatorDiscovery(); // Initialize EmulatorDiscovery


const CACHE_FILE = path.join(app.getPath('userData'), 'platforms-cache.json');
console.log('App user data path:', app.getPath('userData'));
console.log('Cache file path:', CACHE_FILE);
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-platforms', async () => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.platforms;
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }

  try {
    const data = await gs.ssAPI.getSystemsList();

    if (data.response && data.response.systemes) {
      const platforms = data.response.systemes.map(system => {
        const media = {};
        if (Array.isArray(system.medias)) {
            for (const mediaItem of system.medias) {
                // If the media type hasn't been added yet and the URL exists, add it.
                // This prevents duplicates and ensures we have one of each type.
                if (mediaItem.type && mediaItem.url && !media.hasOwnProperty(mediaItem.type)) {
                    // Special handling for videos - we want to keep the video URLs
                    if (mediaItem.type === 'video' && mediaItem.parent) {
                        // For videos, we'll use the parent name as the key and the URL as the value
                        media[mediaItem.parent] = mediaItem.url;
                    } else {
                        media[mediaItem.type] = mediaItem.url;
                    }
                }
            }
        }
        return {
            id: parseInt(system.id, 10),
            name: system.noms && system.noms.noms_commun ? system.noms.noms_commun.split(',')[0] : 'Unknown Platform',
            company: system.compagnie,
            media: media
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), platforms }));
      } catch (error) {
        console.error('Error writing cache:', error);
      }

      return platforms;
    }
    return [];
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return [];
  }
});

ipcMain.handle('load-data', async (event, dataType) => {
  const filePath = path.join(__dirname, 'metadata.json');
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Handle the new tag data types
      if (dataType === 'gameTags' || dataType === 'platformTags') {
        return data[dataType] || [];
      }
      
      return data[dataType] || [];
    }
    return [];
  } catch (error) {
    console.error(`Error loading ${dataType}:`, error);
    return [];
  }
});

ipcMain.handle('save-data', async (event, dataType, data) => {
  const filePath = path.join(__dirname, 'metadata.json');
  try {
    let allData = {};
    if (fs.existsSync(filePath)) {
      allData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    
    // Handle the new tag data types
    if (dataType === 'gameTags' || dataType === 'platformTags') {
      allData[dataType] = data;
    } else {
      allData[dataType] = data;
    }
    
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
  } catch (error) {
    console.error(`Error saving ${dataType}:`, error);
  }
});

ipcMain.handle('get-platform-media', async (event, platformId) => {
  try {
    // First try to get from cache
    if (fs.existsSync(CACHE_FILE)) {
      const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      const numericPlatformId = parseInt(platformId, 10);
      console.log('Searching for platformId:', numericPlatformId, 'in cache.');
      const platform = cachedData.platforms.find(p => p.id === numericPlatformId);
      
      if (platform) {
        console.log('Platform found in cache:', platform.name);
        console.log('Media for platform:', JSON.stringify(platform.media, null, 2));
        return platform.media;
      } else {
        console.log('Platform with id', numericPlatformId, 'not found in cache.');
      }
    }
    
    // If not in cache, fetch from ScreenScraper API
    console.log('Fetching platform media from ScreenScraper API for platformId:', platformId);
    const numericPlatformId = parseInt(platformId, 10);
    
    // Get system media list
    const mediaListResponse = await gs.ssAPI.getSystemMediaList(numericPlatformId);
    console.log('Media list response:', JSON.stringify(mediaListResponse, null, 2));
    
    if (mediaListResponse && mediaListResponse.response && mediaListResponse.response.medias) {
      const media = {};
      
      // Process each media item
      for (const mediaItem of mediaListResponse.response.medias) {
        if (mediaItem.type && mediaItem.url) {
          // Special handling for videos
          if (mediaItem.type === 'video') {
            // For video media, we need to fetch the actual video URL
            try {
              console.log('Fetching video media for parent:', mediaItem.parent);
              const videoMedia = await gs.ssAPI.downloadSystemVideoMedia(numericPlatformId, mediaItem.parent);
              if (videoMedia && typeof videoMedia === 'string' && videoMedia.startsWith('http')) {
                media[mediaItem.parent] = videoMedia;
                console.log('Video media fetched:', mediaItem.parent, videoMedia);
              } else {
                media[mediaItem.parent] = mediaItem.url;
                console.log('Using default video URL:', mediaItem.parent, mediaItem.url);
              }
            } catch (error) {
              console.error('Error fetching video media for', mediaItem.parent, ':', error);
              media[mediaItem.parent] = mediaItem.url;
            }
          } else {
            // For other media types, use the URL directly
            media[mediaItem.type] = mediaItem.url;
          }
        }
      }
      
      console.log('Processed media:', JSON.stringify(media, null, 2));
      return media;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading platform media from cache or API:', error);
    return null;
  }
});

async function queryScreenScraper(platformName) {
  // TODO: Implement ScreenScraper query logic
  return null;
}

async function queryGitHubModels(platformName) {
  // TODO: Implement GitHub Models query logic
  return null;
}

async function queryGemini(platformName, tagNames = []) {
  console.log(`Querying Gemini for platform: ${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(platformName) : String(platformName).replace(/[\x00-\x1F\x7F]/g, '')}`);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  // Format tag names for the prompt
  const tagsList = tagNames.length > 0 ? `Available tags: ${tagNames.join(', ')}.` : 'No tags available.';
  
  const prompt = `Give me information about the following gaming platform: "${platformName}". Please provide the information in JSON format with the following keys: "description" (max 250 words), "release_year", and "manufacturer". Also, based on the platform information, suggest which of the following tags would apply: ${tagsList} Return the suggested tags as an array in a "suggested_tags" key.`;

  try {
    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    console.log('Received response from Gemini:', text);
    
    // Extract JSON from the response
    let jsonText = text;
    
    // Look for JSON in a code block
    const jsonMatch = text.match(/```(?:json)?\s*({.*?})\s*```/s);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
    } else {
      // Try to find JSON without code block markers
      const jsonRegex = /({[^}]+(?:{[^}]+}[^}]*)*})/s;
      const jsonMatch2 = text.match(jsonRegex);
      if (jsonMatch2 && jsonMatch2[1]) {
        jsonText = jsonMatch2[1];
      }
    }
    
    console.log('Extracted JSON text:', jsonText);
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error querying Gemini:', error);
    return null;
  }
}

async function queryGeminiGameTags(gameName, platformName, existingTags = []) {
  console.log(`Querying Gemini for tags for game: ${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(gameName) : String(gameName).replace(/[\x00-\x1F\x7F]/g, '')} on platform: ${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(platformName) : String(platformName).replace(/[\x00-\x1F\x7F]/g, '')}`);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  // Format existing tags for the prompt
  const tagsList = existingTags.length > 0 ? existingTags.map(tag => `"${tag}"`).join(', ') : 'No existing tags available.';
  
  const prompt = `For the game "${gameName}" on the platform "${platformName}", select the most relevant tags from the following list of existing tags: ${tagsList}. Please provide the selected tags as a JSON array of strings. Only return the JSON array, nothing else. If no tags are relevant, return an empty array.`;

  try {
    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    console.log('Received response from Gemini:', text);
    
    // Extract JSON array from the response
    let jsonArrayText = text;
    
    // Look for JSON in a code block
    const jsonArrayMatch = text.match(/```\s*(\[[^\]]*\])\s*```/);
    if (jsonArrayMatch && jsonArrayMatch[1]) {
      jsonArrayText = jsonArrayMatch[1];
    } else {
      // Try to find JSON array without code block markers
      const jsonArrayRegex = /(\[[^\]]*\])/;
      const jsonArrayMatch2 = text.match(jsonArrayRegex);
      if (jsonArrayMatch2 && jsonArrayMatch2[1]) {
        jsonArrayText = jsonArrayMatch2[1];
      }
    }
    
    console.log('Extracted JSON array text:', jsonArrayText);
    return JSON.parse(jsonArrayText);
  } catch (error) {
    console.error('Error querying Gemini for game tags:', error);
    return null;
  }
}

ipcMain.handle('query-data-sources', async (event, platformName, tagNames) => {
  console.log(`Querying data sources for platform: ${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(platformName) : String(platformName).replace(/[\x00-\x1F\x7F]/g, '')}`);
  
  console.log('Trying ScreenScraper...');
  let result = await queryScreenScraper(platformName);
  if (result) {
    console.log('Found result from ScreenScraper');
    return result;
  }
  console.log('No result from ScreenScraper');

  console.log('Trying GitHub Models...');
  result = await queryGitHubModels(platformName);
  if (result) {
    console.log('Found result from GitHub Models');
    return result;
  }
  console.log('No result from GitHub Models');

  console.log('Trying Gemini...');
  result = await queryGemini(platformName, tagNames);
  if (result) {
    console.log('Found result from Gemini:', result);
    return result;
  }
  console.log('No result from Gemini');

  return null;
});

ipcMain.handle('scan-folder', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    return files.filter(file => {
      const filePath = path.join(dirPath, file);
      return fs.statSync(filePath).isFile();
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Update or add each setting
    for (const [key, value] of Object.entries(settings)) {
      // Convert boolean values to strings
      const stringValue = typeof value === 'boolean' ? String(value) : value;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${stringValue}`);
      } else {
        envContent += `\n${key}=${stringValue}`;
      }
    }

    // Write updated content back to .env file
    fs.writeFileSync(envPath, envContent.trim());
    
    // Update process.env for immediate use
    Object.assign(process.env, settings);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const settings = {
      THEGAMESDB_API_KEY: process.env.THEGAMESDB_API_KEY || '',
      RAWG_API_KEY: process.env.RAWG_API_KEY || '',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      LOW_RESOURCES_MODE: process.env.LOW_RESOURCES_MODE === 'true'
    };
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return {};
  }
});

ipcMain.handle('launch-game', async (event, launchConfig) => {
  try {
    const { romPath, emulatorPath, emulatorArgs, workingDirectory, environmentVariables, displayMode, resolution, performance } = launchConfig;
    
    // Validate paths
    if (!romPath || !emulatorPath) {
      throw new Error('ROM path and emulator path are required');
    }
    
    // Check if files exist
    if (!fs.existsSync(romPath)) {
      throw new Error(`ROM file not found: ${romPath}`);
    }
    
    if (!fs.existsSync(emulatorPath)) {
      throw new Error(`Emulator not found: ${emulatorPath}`);
    }
    
    // Replace placeholders in emulator args
    let finalArgs = emulatorArgs || '';
    finalArgs = finalArgs.replace('{romPath}', romPath);
    
    // Prepare environment variables
    const env = { ...process.env, ...environmentVariables };
    
    // Set display mode environment variables if needed
    if (displayMode === 'fullscreen') {
      env.GAMES_FULLSCREEN = '1';
    }
    
    // Import child_process module
    const { spawn } = require('child_process');
    
    // Prepare spawn options
    const spawnOptions = {
      cwd: workingDirectory || path.dirname(emulatorPath),
      detached: true,
      stdio: 'ignore',
      env: env
    };
    
    // Launch the emulator
    const child = spawn(emulatorPath, finalArgs.split(' ').filter(arg => arg !== ''), spawnOptions);
    
    child.unref();
    
    return { success: true };
  } catch (error) {
    console.error('Error launching game:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-game-on-screenscraper', async (event, platformId, gameName) => {
  console.log('Searching for game:', gameName, 'on platform ID:', platformId);

  try {
    // Validate inputs
    if (!gameName || !platformId) {
      console.error('Missing game name or platform ID');
      return { error: 'Missing game name or platform ID' };
    }

    // Use the existing GameService instance to search for games
    const searchResults = await gs.ssAPI.searchGameByName(gameName, platformId);
    console.log('Response from ScreenScraper:', JSON.stringify(searchResults, null, 2));
    
    // Return the first game result or null if no games found
    if (searchResults && searchResults.response && searchResults.response.jeux) {
      // ScreenScraper returns an array of games, we want the first one
      const game = Array.isArray(searchResults.response.jeux) 
        ? searchResults.response.jeux[0] 
        : searchResults.response.jeux;
      
      // Validate that we have a valid game object with an ID
      if (game && game.id) {
        return { success: true, data: game };
      }
    }
    
    return { success: false, error: 'Game not found' };
  } catch (error) {
    console.error('Error searching ScreenScraper:', error);
    // Check if this is an authentication error
    if (error.message.includes('Authentication failed')) {
      return { success: false, error: 'Authentication failed: Please check your ScreenScraper credentials in the .env file' };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-asset-path', async (event, url) => {
  try {
    return await assetManager.getAssetPath(url);
  } catch (error) {
    console.error('Error getting asset path:', error);
    return null;
  }
});

ipcMain.handle('queryGeminiTitlesBatch', async (event, romNames, platformName) => {
  try {
    const result = await queryGeminiTitlesBatch(romNames, platformName);
    return result;
  } catch (error) {
    console.error('Error in queryGeminiTitlesBatch IPC handler:', error);
    throw error;
  }
});

ipcMain.handle('queryGeminiGameTags', async (event, gameName, platformName, existingTags) => {
  try {
    const result = await queryGeminiGameTags(gameName, platformName, existingTags);
    return result;
  } catch (error) {
    console.error('Error in queryGeminiGameTags IPC handler:', error);
    throw error;
  }
});

async function queryGeminiTitlesBatch(romNames, platformName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not found in environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const prompt = `For the platform "${platformName}", what are the likely game titles for the following ROM filenames: ${romNames.join(', ')}. Please return the results as a JSON object where the key is the ROM filename and the value is the suggested game title.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();

  // Extract the JSON from the response
  const jsonMatch = text.match(/```json\s*({.*?})\s*```/s);
  if (jsonMatch && jsonMatch[1]) {
    return JSON.parse(jsonMatch[1]);
  } else {
    // Try to find JSON without markdown
    const jsonRegex = /({[^}]+(?:{[^}]+}[^}]*)*})/s;
    const jsonMatch2 = text.match(jsonRegex);
    if (jsonMatch2 && jsonMatch2[1]) {
      try {
        return JSON.parse(jsonMatch2[1]);
      } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", text);
        throw new Error("Invalid JSON response from Gemini API");
      }
    } else {
      console.error("Failed to parse Gemini response as JSON:", text);
      throw new Error("Invalid JSON response from Gemini API");
    }
  }
}

async function queryGeminiTitle(romName) {

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `You are the world's greatest expert at converting the filenames used for ROMS into the actual name of the name. Use this filename "${romName}" return the title of the game. Your output must be in JSON with one key: title`

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const jsonText = text.replace(/```json\\n/g, '').replace(/```/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error querying Gemini:', error);
    return null;
  }
}

ipcMain.handle('discover-emulators', async (event) => {
  try {
    console.log('Discovering emulators...');
    
    // Send progress updates to the frontend
    const sendProgress = (message) => {
      event.sender.send('emulator-discovery-progress', message);
    };
    
    sendProgress('Initializing emulator discovery...');
    
    const emulators = await emulatorDiscovery.discoverAllEmulators(sendProgress);
    console.log(`Found ${window.Sanitizer ? window.Sanitizer.sanitizeForLog(emulators.length) : emulators.length} emulators`);
    
    sendProgress(`Discovery complete. Found ${window.Sanitizer ? window.Sanitizer.sanitizeForDisplay(emulators.length) : emulators.length} emulators.`);
    
    return emulators;
  } catch (error) {
    console.error('Error discovering emulators:', error);
    return [];
  }
});