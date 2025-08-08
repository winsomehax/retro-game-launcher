const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
//const ScreenScraperAPI = require('./js/screenscraperAPI'); // Ensure screenscraper is imported
const GameService = require('./js/GameService'); // Import GameService

//const ssAPI=new ScreenScraperAPI("Motor1024","QPpIpcSkR2p"); // Initialize the screenscraper API
const gs=new GameService("Motor1024", "QPpIpcSkR2p"); // Initialize GameService with credentials
gs.getGameOverview("Jet Set Willy", 76).then(gameOverview => {
    console.log("Game Overview:", gameOverview);
}).catch(error => {
    console.error("Error fetching game overview:", error);
});
// Example usage of GameService to fetch game overvi
//console.log(gs.getGameOverview("Sonic the Hedgehog", 1)); // Example usage of GameService to fetch game overview

require('dotenv').config();

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

  try
  {
    data=await ssAPI.getSystemsList();

    if (data.response && data.response.systemes) {
      const platforms = data.response.systemes.map(system => {
        const media = {};
        if (Array.isArray(system.medias)) {
            for (const mediaItem of system.medias) {
                // If the media type hasn't been added yet and the URL exists, add it.
                // This prevents duplicates and ensures we have one of each type.
                if (mediaItem.type && mediaItem.url && !media.hasOwnProperty(mediaItem.type)) {
                    media[mediaItem.type] = mediaItem.url;
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
    allData[dataType] = data;
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
  } catch (error) {
    console.error(`Error saving ${dataType}:`, error);
  }
});

ipcMain.handle('get-platform-media', async (event, platformId) => {
  try {
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
    return null;
  } catch (error) {
    console.error('Error reading platform media from cache:', error);
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

async function queryGemini(platformName) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `Give me a max 500 words description of the following gaming platform, titled: "${platformName}". Your output must be in JSON with one key: description`

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const jsonText = text.replace(/```json\n/g, '').replace(/```/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error querying Gemini:', error);
    return null;
  }
}

ipcMain.handle('queryGeminiTitlesBatch', async (event, romNames, platformName) => {
  try {
    const result = await queryGeminiTitlesBatch(romNames, platformName);
    return result;
  } catch (error) {
    console.error('Error in queryGeminiTitlesBatch IPC handler:', error);
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
  const jsonMatch = text.match(/```json\n(.*)\n```/s);
  if (jsonMatch && jsonMatch[1]) {
    return JSON.parse(jsonMatch[1]);
  } else {
    // Fallback for when the model doesn't use markdown
    try {
      return JSON.parse(text);
    } catch (e) {
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
    const jsonText = text.replace(/```json\n/g, '').replace(/```/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error querying Gemini:', error);
    return null;
  }
}

ipcMain.handle('query-data-sources', async (event, platformName) => {
  let result = await queryScreenScraper(platformName);
  if (result) {
    return result;
  }

  result = await queryGitHubModels(platformName);
  if (result) {
    return result;
  }

  result = await queryGemini(platformName);
  if (result) {
    return result;
  }

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

ipcMain.handle('search-game-on-screenscraper', async (event, platformId, gameName) => {
  console.log('Searching for game:', gameName, 'on platform ID:', platformId);

  try {
    const devId = encodeURIComponent(process.env.SCREENSCRAPER_DEVID);
    const devPassword = encodeURIComponent(process.env.SCREENSCRAPER_DEV_PASSWORD);
    
      const url= `https://api.screenscraper.fr/api2/jeuRecherche.php?devid=${devId}&devpassword=${devPassword}&output=json&recherche=${gameName}&systemeid=${platformId}`;
      console.log('Constructed URL:', url);

    //const url= `https://api.screenscraper.fr/api2/infosJeuListe.php?devid={{v_devID}}&devpassword={{v_devpassword}}&output=json&name=sonic`
    //const url = `https://api.screenscraper.fr/api2/jeuInfos.php?devid=${devId}&devpassword=${devPassword}&output=json&systemeid=${platformId}&jeunom=${encodeURIComponent(gameName)}`;

    if (!devId || !devPassword) {
      console.error('Missing Screenscraper credentials');
      return null;
    }

    const response = await net.fetch(url);
    const data = await response.json();
    console.log('Response from ScreenScraper:', data);
    return data.response.jeu;
  } catch (error) {
    console.error('Error searching ScreenScraper:', error);
    return null;
  }
});