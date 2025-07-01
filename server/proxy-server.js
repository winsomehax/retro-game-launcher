import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

let ROMS_BASE_DIRECTORY;

// Function to initialize the app with a specific ROMS_BASE_DIRECTORY
const initializeApp = (baseDir) => {
  ROMS_BASE_DIRECTORY = baseDir;
};

// Helper function to validate and resolve paths
const resolveRomPath = (userProvidedPath) => {
  // 1. Prevent directory traversal attacks
  if (userProvidedPath.includes('..') || path.isAbsolute(userProvidedPath)) {
    throw new Error('Invalid folder path. Must be a relative path without ".." segments.');
  }

  // 2. Resolve the full path
  const fullPath = path.resolve(ROMS_BASE_DIRECTORY, userProvidedPath);

  // 3. Ensure the resolved path is still within the base directory
  // This is a critical security check to prevent access to arbitrary file system locations
  if (!fullPath.startsWith(ROMS_BASE_DIRECTORY)) {
    throw new Error('Access denied: Path is outside the allowed base directory.');
  }

  return fullPath;
};

// Endpoint to scan for ROMs
app.post('/api/scan-roms', async (req, res) => {
  const { platformId, folderPath } = req.body;

  if (typeof platformId !== 'string' || !platformId || typeof folderPath !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required fields: platformId or folderPath.' });
  }

  try {
    const fullPath = resolveRomPath(folderPath);

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: `Specified path is not a directory: ${folderPath}` });
    }

    const files = await fs.readdir(fullPath, { withFileTypes: true });

    const romFiles = files
      .filter(dirent => dirent.isFile() && !dirent.name.startsWith('.') && !dirent.name.endsWith('.txt')) // Basic filtering
      .map(dirent => {
        const fileName = dirent.name;
        const displayName = fileName.substring(0, fileName.lastIndexOf('.')); // Remove extension for display
        return { displayName, fileName };
      });

    res.status(200).json(romFiles);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: `Directory not found: ${folderPath}` });
    }
    if (error.code === 'EACCES') {
      return res.status(403).json({ error: `Permission denied for directory: ${folderPath}` });
    }
    if (error.message.includes('Invalid folder path') || error.message.includes('Access denied')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error scanning ROMs:', error);
    res.status(500).json({ error: 'Internal server error during ROM scan.' });
  }
});

// Route to fetch platform images from TheGamesDB API
app.get('/api/thegamesdb/platform_images', async (req, res) => {
  const { id: platformId } = req.query;
  const apiKey = process.env.THEGAMESDB_API_KEY;

  // Validate platformId
  if (!platformId) {
    return res.status(400).json({ error: 'Missing required query parameter: id' });
  }

  // Validate API key
  if (!apiKey) {
    console.error('TheGamesDB API key is not configured on the server.');
    return res.status(500).json({ error: 'Application error: TheGamesDB API key is not configured.' });
  }

  try {
    const response = await axios.get('https://api.thegamesdb.net/v1/Platforms/Images', {
      params: {
        apikey: apiKey,
        platforms_id: platformId,
      },
      timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '10000', 10), // Default 10 seconds
    });

    // Handle non-200 responses from TheGamesDB
    if (response.status !== 200) {
      return res.status(response.status).json({
        error: `TheGamesDB API responded with status: ${response.status}`,
        details: response.data
      });
    }

    const responseData = response.data;

    // Ensure the response structure is as expected
    if (!responseData || !responseData.data || !responseData.data.base_url || !responseData.data.images) {
      console.error('Unexpected response structure from TheGamesDB:', responseData);
      return res.status(502).json({ error: 'Unexpected response structure from TheGamesDB API.' });
    }

    const baseUrl = responseData.data.base_url.original;
    const platformImages = responseData.data.images[platformId];

    // Handle cases where no images are found for the platform
    if (!platformImages || platformImages.length === 0) {
      return res.status(404).json({
        message: `No images found for platform ID: ${platformId}`,
        base_url: baseUrl, // Still return base_url as per schema
        images: []
      });
    }

    // Return the extracted base URL and images
    res.status(200).json({
      base_url: baseUrl,
      images: platformImages,
    });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // TheGamesDB API responded with an error status (4xx or 5xx)
        return res.status(error.response.status).json({
          error: `Error from TheGamesDB API: ${error.response.data.message || error.message}`,
          details: error.response.data,
        });
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        return res.status(504).json({ error: 'Gateway Timeout: No response from TheGamesDB API.' });
      } else {
        // Network error or other Axios error
        console.error('Axios error calling TheGamesDB:', error.message);
        return res.status(502).json({ error: `Bad Gateway: Could not connect to TheGamesDB API. ${error.message}` });
      }
    }
    // Other unexpected errors
    console.error('Error fetching platform images:', error);
    res.status(500).json({ error: 'Internal server error while fetching platform images.' });
  }
});

// Endpoint to enrich ROM names using AI
app.post('/api/enrich-roms', async (req, res) => {
  const { romNames, platformName } = req.body;

  if (!Array.isArray(romNames) || romNames.length === 0) {
    return res.status(400).json({ error: 'Request body must contain a non-empty "romNames" array.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  const EXTERNAL_API_TIMEOUT = parseInt(process.env.EXTERNAL_API_TIMEOUT || '10000', 10); // Default 10 seconds
  const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';

  try {
    const prompt = `Given the following raw ROM names for the ${platformName || 'unknown'} platform, suggest a more user-friendly, official-looking title for each. Provide the output as a JSON array of objects, where each object has 'original_name' and 'suggested_title' keys. Do not include any other text or markdown formatting outside the JSON. Example: [{ "original_name": "smb", "suggested_title": "Super Mario Bros." }]

ROM Names: ${romNames.join(', ')}`;

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        timeout: EXTERNAL_API_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const responseData = geminiResponse.data;

    if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
      return res.status(400).json({ error: `AI content generation blocked: ${responseData.promptFeedback.blockReason}` });
    }

    if (!responseData.candidates || responseData.candidates.length === 0) {
      return res.status(502).json({ error: 'AI service returned unexpected or empty data structure.', details: responseData });
    }

    let aiText = responseData.candidates[0].content.parts[0].text;

    // Remove markdown backticks if present
    if (aiText.startsWith('```json') && aiText.endsWith('```')) {
      aiText = aiText.substring(7, aiText.length - 3).trim();
    }

    let enrichedRoms;
    try {
      enrichedRoms = JSON.parse(aiText);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse game title suggestions from AI.', details: aiText });
    }

    if (!Array.isArray(enrichedRoms)) {
      return res.status(500).json({ error: 'Failed to parse game title suggestions from AI: Expected an array.', details: enrichedRoms });
    }

    res.status(200).json({ source: 'Gemini', enriched_roms: enrichedRoms });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data, headers } = error.response;
        const errorMessage = data.error?.message || JSON.stringify(data);
        return res.status(status).json({
          message: `AI service responded with an error: ${errorMessage}`, // Changed from 'error' to 'message'
          details: { status, bodyPreview: data, headers },
        });
      } else if (error.code === 'ECONNABORTED') { // Check for timeout error code
        return res.status(504).json({ error: 'Gateway Timeout: No response from AI API (enrich ROMs).' });
      } else {
        // Something happened in setting up the request that triggered an Error
        return res.status(500).json({ error: `Error setting up AI request: ${error.message}` });
      }
    }
    console.error('Error enriching ROMs:', error);
    res.status(500).json({ error: 'Internal server error during ROM enrichment.' });
  }
});

// Helper function to get data file path
const getDataFilePath = (dataType) => {
  return path.join(process.cwd(), 'server', 'data', `${dataType}.json`);
};

// Generic GET endpoint for data
app.get('/api/data/:dataType', async (req, res) => {
  const { dataType } = req.params;
  try {
    const filePath = getDataFilePath(dataType);
    const data = await fs.readFile(filePath, 'utf8');
    res.status(200).json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return empty array
      return res.status(200).json([]);
    }
    console.error(`Error reading ${dataType} data:`, error);
    res.status(500).json({ error: `Failed to read ${dataType} data.` });
  }
});

// Generic POST endpoint for data
app.post('/api/data/:dataType', async (req, res) => {
  const { dataType } = req.params;
  const data = req.body;
  try {
    const filePath = getDataFilePath(dataType);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.status(200).json({ message: `${dataType} data saved successfully.` });
  } catch (error) {
    console.error(`Error writing ${dataType} data:`, error);
    res.status(500).json({ error: `Failed to save ${dataType} data.` });
  }
});

// Export the app and initializeApp for testing purposes
export { app, initializeApp };

// Start the server if this file is run directly
if (process.env.NODE_ENV !== 'test') {
  initializeApp(process.env.ROMS_BASE_DIR || path.resolve(process.cwd(), 'roms'));
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Proxy server listening on port ${PORT}`);
  });
}
