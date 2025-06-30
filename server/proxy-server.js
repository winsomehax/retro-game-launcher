import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { URL } from 'url'; // Import URL for parsing
import { fileURLToPath } from 'url'; // Added for ES Module __dirname
import fs from 'fs'; // Import File System module
import path, { dirname } from 'path'; // Import Path module and dirname for ES Module __dirname

dotenv.config(); // For loading .env file from the project root

// Polyfill for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default base directory for user ROMs, relative to the project root
// __dirname is server/ so ../ goes to project root.
const DEFAULT_ROMS_BASE_PATH = path.resolve(__dirname, '..', 'user_rom_files');
const ROMS_BASE_DIRECTORY = process.env.ROMS_BASE_DIR
  ? path.resolve(process.env.ROMS_BASE_DIR)
  : DEFAULT_ROMS_BASE_PATH;

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuration ---
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Default to common Vite frontend dev port
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization"
};

const GITHUB_PAT_TOKEN = process.env.GITHUB_PAT_TOKEN;
const THEGAMESDB_API_KEY = process.env.THEGAMESDB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RAWG_API_KEY = process.env.RAWG_API_KEY;
const EXTERNAL_API_TIMEOUT = parseInt(process.env.EXTERNAL_API_TIMEOUT, 10) || 10000; // Default 10s
const TGDB_PLATFORMS_CACHE_PATH = path.join(__dirname, './data/thegamesdb_platforms.json');
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let tgdbPlatformsMap = new Map(); // For game enrichment
let tgdbPlatformsList = []; // For the API endpoint

async function refreshTheGamesDBPlatformsCacheIfNeeded() {
    let shouldFetch = false;
    try {
        if (fs.existsSync(TGDB_PLATFORMS_CACHE_PATH)) {
            const fileContent = await fs.promises.readFile(TGDB_PLATFORMS_CACHE_PATH, 'utf-8');
            const cachedData = JSON.parse(fileContent);
            if (cachedData.lastUpdated && (Date.now() - new Date(cachedData.lastUpdated).getTime()) < ONE_WEEK_MS) {
                console.log("TheGamesDB platforms cache is up-to-date.");
                tgdbPlatformsList = cachedData.platforms || [];
                // Populate tgdbPlatformsMap from the fresh cache
                tgdbPlatformsMap.clear();
                if (Array.isArray(tgdbPlatformsList)) {
                    tgdbPlatformsList.forEach(platform => {
                        tgdbPlatformsMap.set(platform.id, { name: platform.name, alias: platform.alias });
                    });
                }
                console.log(`Loaded ${tgdbPlatformsMap.size} platforms into tgdbPlatformsMap from cache.`);
            } else {
                console.log("TheGamesDB platforms cache is outdated or missing lastUpdated timestamp.");
                shouldFetch = true;
            }
        } else {
            console.log("TheGamesDB platforms cache file not found.");
            shouldFetch = true;
        }
    } catch (error) {
        console.error("Error reading TheGamesDB platforms cache:", error.message);
        shouldFetch = true; // Fetch if cache is corrupt or unreadable
    }

    if (shouldFetch) {
        if (!TGDB_API_KEY) {
            console.error("Cannot refresh TheGamesDB platforms: THEGAMESDB_API_KEY is not set.");
            // Attempt to load from existing file if fetching is not possible, even if outdated
            if (tgdbPlatformsList.length === 0 && fs.existsSync(TGDB_PLATFORMS_CACHE_PATH)) {
                try {
                    console.warn("Attempting to load potentially outdated platforms cache as fallback.");
                    const fileContent = await fs.promises.readFile(TGDB_PLATFORMS_CACHE_PATH, 'utf-8');
                    const cachedData = JSON.parse(fileContent);
                    tgdbPlatformsList = cachedData.platforms || [];
                     // Populate tgdbPlatformsMap
                    tgdbPlatformsMap.clear();
                    if(Array.isArray(tgdbPlatformsList)) {
                        tgdbPlatformsList.forEach(platform => {
                            tgdbPlatformsMap.set(platform.id, { name: platform.name, alias: platform.alias });
                        });
                    }
                    console.log(`Loaded ${tgdbPlatformsMap.size} platforms into tgdbPlatformsMap from stale cache fallback.`);
                } catch (fallbackError) {
                    console.error("Failed to load stale platforms cache as fallback:", fallbackError.message);
                }
            }
            if (tgdbPlatformsList.length === 0) { // If still no data, warn that platform features will be limited
                 console.warn("TheGamesDB Platforms list is empty. Platform selection and some game details might be unavailable.");
            }
            return;
        }

        console.log("Fetching fresh TheGamesDB platforms data...");
        try {
            const fields = "icon,console,controller,developer,manufacturer,media,cpu,memory,graphics,sound,maxcontrollers,display,overview,youtube";
            const targetUrl = `https://api.thegamesdb.net/v1/Platforms?apikey=${TGDB_API_KEY}&fields=${encodeURIComponent(fields)}`;

            const response = await axios.get(targetUrl, { timeout: EXTERNAL_API_TIMEOUT });

            if (response.data && response.data.data && response.data.data.platforms) {
                const platformsObject = response.data.data.platforms;
                const newPlatformsList = Object.values(platformsObject); // Convert object of platforms to array

                const dataToCache = {
                    lastUpdated: new Date().toISOString(),
                    platforms: newPlatformsList,
                    // Store base_image_url if provided by API, for constructing full icon URLs later
                    base_image_url: response.data.include?.images?.base_url?.original || // Example path, adjust if different
                                   response.data.include?.boxart?.base_url?.medium || // Fallback, adjust
                                   "https://images.thegamesdb.net/" // Default fallback if nothing else
                };
                await fs.promises.writeFile(TGDB_PLATFORMS_CACHE_PATH, JSON.stringify(dataToCache, null, 2), 'utf-8');
                console.log(`Successfully fetched and cached ${newPlatformsList.length} TheGamesDB platforms.`);
                tgdbPlatformsList = newPlatformsList;

                // Repopulate tgdbPlatformsMap with fresh data
                tgdbPlatformsMap.clear();
                newPlatformsList.forEach(platform => {
                    tgdbPlatformsMap.set(platform.id, { name: platform.name, alias: platform.alias });
                });
                console.log(`Populated tgdbPlatformsMap with ${tgdbPlatformsMap.size} fresh platforms.`);

            } else {
                console.warn("Fetched TheGamesDB platforms data is not in the expected format:", response.data);
                if (tgdbPlatformsList.length === 0) { // If fetch failed and list is empty, warn
                    console.warn("TheGamesDB Platforms list remains empty after fetch attempt.");
                }
            }
        } catch (error) {
            console.error("Error fetching TheGamesDB platforms:", error.message);
            if (axios.isAxiosError(error) && error.response) {
                console.error("API Response Status:", error.response.status);
                console.error("API Response Data:", error.response.data);
            }
            if (tgdbPlatformsList.length === 0) { // If fetch failed and list is empty, warn
                 console.warn("TheGamesDB Platforms list is empty due to fetch error. Platform selection might be unavailable.");
            }
        }
    }
}

// Initial load of platforms cache
// Wrap in an async IIFE to use await at the top level if needed for startup sequencing
(async () => {
    try {
        await refreshTheGamesDBPlatformsCacheIfNeeded();
    } catch (err) {
        console.error("Failed initial TheGamesDB platforms cache refresh during startup:", err);
        // Fallback logic for tgdbPlatformsMap is already inside refreshTheGamesDBPlatformsCacheIfNeeded
        // and will also attempt to load from stale cache if direct refresh fails.
        // If tgdbPlatformsMap is still empty, a warning is logged by the function itself.
    }
})();


// --- Middleware ---
app.use(cors(corsOptions)); // Enable CORS with configured options
app.use(express.json());   // To parse JSON request bodies

// --- TheGamesDB Platforms API Endpoint ---
app.get('/api/thegamesdb/platforms', async (req, res) => {
    // Ensure the cache is loaded/refreshed before responding if it hasn't been.
    // This also handles the case where the server has been running for a while and the cache might be stale
    // (though a periodic refresh is better for long-running servers, this covers on-demand).
    // However, for simplicity and to avoid delaying the first request significantly if a fetch is needed,
    // we'll rely on the startup refresh and return the current tgdbPlatformsList.
    // A more robust solution might trigger a refresh here if the list is empty or deemed too old.

    if (tgdbPlatformsList && tgdbPlatformsList.length > 0) {
        // Optionally, could also return the base_image_url from the cache file if needed by client
        // For now, just returning the platforms array.
        // const cachedFile = JSON.parse(await fs.promises.readFile(TGDB_PLATFORMS_CACHE_PATH, 'utf-8'));
        // res.status(200).json({ platforms: tgdbPlatformsList, base_image_url: cachedFile.base_image_url });
        // res.status(200).json(tgdbPlatformsList); // Old implementation
        // New implementation: return platforms list and base_image_url
        try {
            const fileContent = await fs.promises.readFile(TGDB_PLATFORMS_CACHE_PATH, 'utf-8');
            const cachedData = JSON.parse(fileContent);
            res.status(200).json({
                platforms: tgdbPlatformsList,
                base_image_url: cachedData.base_image_url
            });
        } catch (error) {
            console.error("Error reading TGDB_PLATFORMS_CACHE_PATH to get base_image_url:", error);
            // Fallback to sending just platforms if reading the cache for base_image_url fails
            // but tgdbPlatformsList is somehow populated (e.g. from a previous successful read)
            res.status(200).json({ platforms: tgdbPlatformsList, base_image_url: null });
        }
    } else {
        // Attempt a refresh if the list is empty, in case initial load failed or file was deleted.
        // This makes the endpoint more resilient.
        console.warn('/api/thegamesdb/platforms called when tgdbPlatformsList is empty. Attempting a refresh.');
        try {
            await refreshTheGamesDBPlatformsCacheIfNeeded();
            if (tgdbPlatformsList && tgdbPlatformsList.length > 0) {
                // After refresh, try to send data including base_image_url
                try {
                    const fileContent = await fs.promises.readFile(TGDB_PLATFORMS_CACHE_PATH, 'utf-8');
                    const cachedData = JSON.parse(fileContent);
                    res.status(200).json({
                        platforms: tgdbPlatformsList,
                        base_image_url: cachedData.base_image_url
                    });
                } catch (error) {
                    console.error("Error reading TGDB_PLATFORMS_CACHE_PATH post-refresh:", error);
                    res.status(200).json({ platforms: tgdbPlatformsList, base_image_url: null });
                }
            } else {
                console.error("Failed to populate TheGamesDB platforms list even after refresh attempt.");
                res.status(503).json({ error: 'TheGamesDB platforms data is currently unavailable. Please try again later.' });
            }
        } catch (error) {
            console.error("Error during on-demand refresh for /api/thegamesdb/platforms:", error);
            res.status(500).json({ error: 'Failed to retrieve TheGamesDB platforms data due to a server error.' });
        }
    }
});

// Endpoint for Gemini API - Enrich ROM Names to Game Titles
app.post('/api/enrich-roms', async (req, res) => {
    const { romNames, platformName } = req.body; // Expecting { "romNames": ["rom1", "rom2"], "platformName": "Nintendo Entertainment System" }

    if (!romNames || !Array.isArray(romNames) || romNames.length === 0) {
        return res.status(400).json({ error: 'Request body must contain a non-empty "romNames" array.' });
    }
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const romNameExamples = romNames.map(name => `"${name}"`).join(', ');
    const platformContext = platformName ? `for the gaming platform "${platformName}"` : "";

    const prompt = `Given the following list of ROM file names: ${romNameExamples}${platformContext}. These are often abbreviated or slightly incorrect. Provide the accurate or commonly accepted full game title for each.
Return the data as a valid JSON array of objects, where each object has exactly two keys: "original_name" (the input ROM name) and "suggested_title" (the full, corrected game title).
For example, if the input is ["mkombat", "stfighter2"], the output should be similar to:
[
  { "original_name": "mkombat", "suggested_title": "Mortal Kombat" },
  { "original_name": "stfighter2", "suggested_title": "Street Fighter II" }
]
Ensure the output is only the JSON array, with no surrounding text, comments, or markdown formatting like \`\`\`json.`;

    const contents = [{ "parts": [{ "text": prompt }] }];
    console.log(`Gemini /api/enrich-roms prompt for ${romNames.length} roms (platform: ${platformName || 'N/A'}): First few - ${romNames.slice(0,3).join(', ')}`);

    try {
        const apiResponse = await axios.post(targetUrl, { contents }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: EXTERNAL_API_TIMEOUT * 2, // Potentially longer timeout for multiple items
        });

        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data.candidates && apiResponse.data.candidates.length > 0 &&
                apiResponse.data.candidates[0].content && apiResponse.data.candidates[0].content.parts &&
                apiResponse.data.candidates[0].content.parts.length > 0) {

                const generatedText = apiResponse.data.candidates[0].content.parts[0].text;
                try {
                    // Attempt to parse the text directly as JSON, assuming AI follows instructions.
                    // Remove markdown backticks if present.
                    const cleanedText = generatedText.replace(/^```json\s*|```\s*$/g, '');
                    const enrichedData = JSON.parse(cleanedText);

                    if (!Array.isArray(enrichedData)) {
                        throw new Error("AI response was valid JSON but not an array.");
                    }
                    // Further validation could check if each object has the required keys.
                    // For now, we trust the AI's structure if it's a valid JSON array.

                    console.log(`Gemini /api/enrich-roms successful for ${romNames.length} roms. Parsed ${enrichedData.length} results.`);
                    res.json({
                        source: 'Gemini',
                        enriched_roms: enrichedData,
                    });

                } catch (parseError) {
                    console.error("Gemini /api/enrich-roms: Error parsing generated text as JSON:", parseError.message);
                    console.error("Gemini raw response text for parsing error:", generatedText);
                    res.status(500).json({ error: 'Failed to parse game title suggestions from AI.', details: generatedText });
                }
            } else {
                console.warn("Gemini /api/enrich-roms: No candidates or unexpected JSON structure.", apiResponse.data);
                // Check for safetyRatings or other non-content responses
                if (apiResponse.data.promptFeedback && apiResponse.data.promptFeedback.blockReason) {
                    console.error("Gemini /api/enrich-roms: Prompt blocked.", apiResponse.data.promptFeedback);
                    return res.status(400).json({ error: `AI content generation blocked: ${apiResponse.data.promptFeedback.blockReason}`, details: apiResponse.data.promptFeedback });
                }
                res.status(502).json({ error: 'AI service returned unexpected or empty data structure.', details: apiResponse.data });
            }
        } else {
            console.error("Gemini /api/enrich-roms returned non-JSON response. Content-Type:", contentType);
            console.error("Gemini /api/enrich-roms response data:", apiResponse.data);
            res.status(502).json({
                error: 'Bad Gateway: AI API (enrich ROMs) returned non-JSON response.',
                details: { contentType: contentType, bodyPreview: String(apiResponse.data).substring(0, 200) }
            });
        }
    } catch (error) {
        console.error("Gemini /api/enrich-roms request failed:", error.message);
        if (error.response) {
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;
            let errorDetails = responseData;

            if (contentType && contentType.includes('application/json')) {
                errorDetails = responseData.error || responseData; // Gemini often has a nested 'error' object
                console.error("Gemini /api/enrich-roms API error details:", errorDetails);
                res.status(error.response.status).json({
                    message: `Error from AI API (enrich ROMs): ${errorDetails.message || 'Unknown error'}`,
                    details: errorDetails
                });
            } else {
                console.error("Gemini /api/enrich-roms error response was not JSON. Content-Type:", contentType);
                console.error("Gemini /api/enrich-roms error response data:", responseData);
                res.status(error.response.status).json({
                    error: 'Error from AI API (enrich ROMs, non-JSON response).',
                    details: {
                        statusCode: error.response.status,
                        contentType: contentType,
                        bodyPreview: String(responseData).substring(0, 200)
                    }
                });
            }
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from AI API (enrich ROMs).' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while calling AI API for ROM name enrichment.' });
        }
    }
});

app.get('/api/thegamesdb/platform_images', async (req, res) => {
    const { id } = req.query; // Platform ID from the client
    if (!id) {
        return res.status(400).json({ error: 'Query parameter "id" (platform ID) is required.' });
    }
    if (!TGDB_API_KEY) {
        console.error("TheGamesDB API key (THEGAMESDB_API_KEY) is not configured on the server.");
        return res.status(500).json({ error: 'TheGamesDB API key is not configured on the server.' });
    }

    const imageTypes = 'fanart,banner,boxart'; // As per original request
    const targetUrl = `https://api.thegamesdb.net/v1/Platforms/Images`;

    // Params adjusted based on the original URL encoding observation: filter%5Btype%5D=fanart%2C%20banner%2C%20boxart
    const adjustedParams = {
        apikey: TGDB_API_KEY,
        platforms_id: id,
        'filter[type]': imageTypes
    };

    console.log(`Fetching TheGamesDB platform images for ID: ${id}, URL: ${targetUrl}, Params: ${JSON.stringify(adjustedParams)}`);

    try {
        const apiResponse = await axios.get(targetUrl, {
            params: adjustedParams,
            timeout: EXTERNAL_API_TIMEOUT,
        });

        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data && apiResponse.data.data && apiResponse.data.data.images && apiResponse.data.data.base_url) {
                // Successfully fetched images. The API keys images by platform ID.
                // So, apiResponse.data.data.images will be like { "40": [ ...image objects... ] }
                const platformSpecificImages = apiResponse.data.data.images[id] || [];

                res.status(200).json({
                    base_url: apiResponse.data.data.base_url,
                    images: platformSpecificImages,
                    // For debugging, let's see what keys are in the images object if it's not the requested id
                    // original_response_platform_id_keys: Object.keys(apiResponse.data.data.images)
                });

            } else if (apiResponse.data && apiResponse.data.code && apiResponse.data.code !== 200) {
                // Handle API-level errors from TheGamesDB (e.g., invalid ID, API key issue)
                console.warn(`TheGamesDB API returned code ${apiResponse.data.code} for platform images (ID: ${id}):`, apiResponse.data);
                res.status(apiResponse.data.code === 404 ? 404 : 502).json({
                    error: `TheGamesDB API error: ${apiResponse.data.status || 'Failed to fetch images'}`,
                    details: apiResponse.data
                });
            } else {
                // Valid JSON, but not the expected structure (e.g., no images for the ID, or missing base_url)
                // This case could also mean an empty image list for a valid ID.
                // The API when no images are found for an ID, returns "data": { "count": 0, "images": { "<id>": [] }, "base_url": { ... } }
                // So, if images[id] is empty or undefined, but base_url exists, it's a valid "no images" response.
                if (apiResponse.data && apiResponse.data.data && apiResponse.data.data.base_url && apiResponse.data.data.images && !apiResponse.data.data.images[id]) {
                     res.status(200).json({ // No specific images for this ID, but the call was successful
                        base_url: apiResponse.data.data.base_url,
                        images: []
                    });
                } else {
                    console.warn(`TheGamesDB platform images response for ID ${id} was JSON but had unexpected structure or missing data:`, apiResponse.data);
                    res.status(502).json({ error: 'Bad Gateway: Unexpected response structure from TheGamesDB for platform images.', details: apiResponse.data });
                }
            }
        } else {
            // Non-JSON response from TheGamesDB
            console.error(`TheGamesDB (platform images ID: ${id}) returned non-JSON response. Content-Type:`, contentType);
            console.error(`TheGamesDB (platform images ID: ${id}) response data:`, apiResponse.data);
            res.status(502).json({
                error: 'Bad Gateway: TheGamesDB API (platform images) returned non-JSON response.',
                details: {
                    contentType: contentType,
                    bodyPreview: String(apiResponse.data).substring(0, 200)
                }
            });
        }
    } catch (error) {
        console.error(`Error calling TheGamesDB Platform Images API for ID ${id}:`, error.message);
        if (error.response) {
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;
            if (contentType && contentType.includes('application/json')) {
                res.status(error.response.status).json(responseData.error || responseData);
            } else {
                res.status(error.response.status).json({
                    error: `Error from TheGamesDB (platform images, non-JSON response for ID ${id}): ${error.message}`,
                    details: { bodyPreview: String(responseData).substring(0,200) }
                });
            }
        } else if (error.request) {
            res.status(504).json({ error: `Gateway Timeout: No response from TheGamesDB (platform images for ID ${id}).` });
        } else {
            res.status(500).json({ error: `Internal Server Error while fetching platform images for ID ${id} from TheGamesDB.` });
        }
    }
});

// (Optional but Recommended) Middleware to check for the proxy secret
// if (PROXY_SECRET) {
//     app.use('/api/*', (req, res, next) => { // Apply to all /api routes
//         const clientSecret = req.headers['x-proxy-secret'];
//         if (clientSecret === PROXY_SECRET) {
//             next();
//         } else {
//             console.warn('Access denied to API due to missing or invalid X-Proxy-Secret header.');
//             res.status(403).json({ error: 'Forbidden: Invalid or missing proxy secret.' });
//         }
//     });
// }

// --- Routes ---

// Helper function to handle external API calls
async function makeExternalApiCall(req, res, targetUrl, method = 'GET', params = {}, data = {}, additionalHeaders = {}) {
    try {
        const requestHeaders = {
            'Accept': 'application/json', // Prefer JSON responses
            ...additionalHeaders,
        };

        // Example: Add API key for TheGamesDB if the URL matches
        if (targetUrl.startsWith('https://api.thegamesdb.net') && process.env.THEGAMESDB_API_KEY) {
            // TheGamesDB API key is typically sent as a query parameter, not a header.
            // So, ensure it's added to `params` before calling this function.
        } else if (targetUrl.startsWith('https://generativelanguage.googleapis.com') && process.env.GEMINI_API_KEY) {
            // Gemini API key is also typically sent as a query parameter `key`.
        } else if (EXTERNAL_API_KEY && !targetUrl.startsWith('https://api.rawg.io')) { // RAWG uses key in query
            // Generic API key for other services, if applicable
            requestHeaders['Authorization'] = `Bearer ${EXTERNAL_API_KEY}`;
        }


        const response = await axios({
            method: method,
            url: targetUrl,
            params: params, // URL query parameters
            data: data,     // Request body
            headers: requestHeaders,
            timeout: EXTERNAL_API_TIMEOUT,
        });
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`Error calling external API ${targetUrl}:`, error.message);
        if (error.response) {
            // Forward the error status and data from the external API if available
            res.status(error.response.status).json({
                message: `Error from external API: ${error.response.data.message || error.message}`,
                details: error.response.data
            });
        } else if (error.request) {
            // The request was made but no response was received
            res.status(504).json({ error: 'Gateway Timeout: No response from target server.' });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({ error: 'Internal Server Error while processing the request.' });
        }
    }
}

// Endpoint for TheGamesDB API - ByGameName
app.get('/api/search/thegamesdb/bygamename', async (req, res) => {
    const { name, fields, include, page } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Query parameter "name" is required.' });
    }
    if (!process.env.THEGAMESDB_API_KEY) {
        return res.status(500).json({ error: 'TheGamesDB API key is not configured on the server.' });
    }

    const targetUrl = `https://api.thegamesdb.net/v1.1/Games/ByGameName`;
    const params = {
        apikey: process.env.THEGAMESDB_API_KEY,
        name,
        fields: fields || 'platform,overview,players,publishers,genres,last_updated,rating,coop,youtube,alternates', // Sensible defaults
        include: include || 'boxart,platform', // Sensible defaults
        ...(page && { page })
    };

    // Simplified response transformation
    try {
        const apiResponse = await axios.get(targetUrl, { params, timeout: EXTERNAL_API_TIMEOUT });

        // Ensure the response from TheGamesDB is JSON before proceeding
        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data && apiResponse.data.data && apiResponse.data.data.games) {
                const transformedGames = apiResponse.data.data.games.map(game => {
                    let boxartUrl = null;
                    if (apiResponse.data.include && apiResponse.data.include.boxart && apiResponse.data.include.boxart.data[game.id]) {
                        const boxartEntries = apiResponse.data.include.boxart.data[game.id];
                        const frontBoxart = boxartEntries.find(b => b.side === 'front');
                        if (frontBoxart) {
                            boxartUrl = `${apiResponse.data.include.boxart.base_url.medium}${frontBoxart.filename}`;
                        }
                    }
                    const platformId = game.platform;
                    const sourcePlatformDetails = tgdbPlatformsMap.get(platformId);

                    return {
                        id: game.id,
                        title: game.game_title,
                        release_date: game.release_date,
                        platform_id: platformId,
                        source_platform_details: sourcePlatformDetails || { id: platformId, name: `Unknown TGDB ID: ${platformId}`, alias: `unknown-tgdb-${platformId}` },
                        overview: game.overview,
                        players: game.players,
                        genres: game.genres,
                        rating: game.rating,
                        boxart_url: boxartUrl,
                    };
                });

                res.json({
                    source: 'TheGamesDB',
                    count: apiResponse.data.data.count,
                    games: transformedGames,
                    pages: apiResponse.data.pages,
                    remaining_allowance: apiResponse.data.remaining_monthly_allowance
                });
            } else {
                // Still JSON, but not the expected structure
                console.warn("TheGamesDB response was JSON but had unexpected structure:", apiResponse.data);
                res.status(200).json(apiResponse.data);
            }
        } else {
            // Non-JSON response from TheGamesDB
            console.error("TheGamesDB returned non-JSON response. Content-Type:", contentType);
            console.error("TheGamesDB response data:", apiResponse.data);
            res.status(502).json({
                error: 'Bad Gateway: TheGamesDB returned non-JSON response.',
                details: {
                    contentType: contentType,
                    body: apiResponse.data // Send the first few characters as a preview if it's too long
                }
            });
        }
    } catch (error) {
        console.error("TheGamesDB ByGameName request failed:", error.message);
        if (error.response) {
            // External API responded with an error status code
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;

            if (contentType && contentType.includes('application/json')) {
                // If it's JSON, pass it through (or a structured subset of it)
                res.status(error.response.status).json(responseData.error || responseData);
            } else {
                // If it's not JSON (e.g., HTML error page from TheGamesDB)
                console.error("TheGamesDB error response was not JSON. Content-Type:", contentType);
                console.error("TheGamesDB error response data:", responseData);
                res.status(error.response.status).json({
                    error: 'Error from TheGamesDB (non-JSON response).',
                    details: {
                        statusCode: error.response.status,
                        contentType: contentType,
                        bodyPreview: typeof responseData === 'string' ? responseData.substring(0, 200) + (responseData.length > 200 ? '...' : '') : 'Non-string body'
                    }
                });
            }
        } else if (error.request) {
            // The request was made but no response was received
            res.status(504).json({ error: 'Gateway Timeout: No response from TheGamesDB.' });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({ error: 'Internal Server Error while fetching from TheGamesDB.' });
        }
    }
});

// Endpoint for Gemini API - Enrich Game List
app.post('/api/gemini/enrich-gamelist', async (req, res) => {
    const { gameList } = req.body; // Expecting body like: { "gameList": [{ "title": "Game 1" }, { "title": "Game 2" }] }
    if (!gameList || !Array.isArray(gameList) || gameList.length === 0) {
        return res.status(400).json({ error: 'Request body must contain a non-empty "gameList" array.' });
    }
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Construct the prompt for Gemini
    const gameTitles = gameList.map(game => game.title).join(', ');
    const prompt = `For the following game titles: ${gameTitles}, provide a short, engaging description for each, suitable for a game library. `+
    `Return the data as a pure valid JSON array where each object has "title", "description", "genre", "release" fields. You must NOT return `+
    `anything other than valid JSON that can be used directly. No extra characters or words or labelling it "json".`;

    const contents = [{ "parts": [{ "text": prompt }] }];

    try {
        const apiResponse = await axios.post(targetUrl, { contents }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: EXTERNAL_API_TIMEOUT,
        });

        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data.candidates && apiResponse.data.candidates.length > 0) {
                const generatedText = apiResponse.data.candidates[0].content.parts[0].text;
                try {
                    const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
                    let enrichedData;
                    if (jsonMatch && jsonMatch[1]) {
                        enrichedData = JSON.parse(jsonMatch[1]);
                    } else {
                        enrichedData = JSON.parse(generatedText);
                    }
                    res.json({
                        source: 'Gemini',
                        enriched_games: enrichedData,
                    });
                } catch (parseError) {
                    console.error("Gemini enrich-gamelist: Error parsing generated text as JSON:", parseError.message);
                    console.error("Gemini raw response text for parsing error:", generatedText);
                    res.status(500).json({ error: 'Failed to parse game enrichment data from Gemini.', details: generatedText });
                }
            } else {
                console.warn("Gemini enrich-gamelist: No candidates or unexpected JSON structure.", apiResponse.data);
                res.status(200).json(apiResponse.data); // Forward if JSON but not expected structure
            }
        } else {
            console.error("Gemini enrich-gamelist returned non-JSON response. Content-Type:", contentType);
            console.error("Gemini enrich-gamelist response data:", apiResponse.data);
            res.status(502).json({
                error: 'Bad Gateway: Gemini API (enrich) returned non-JSON response.',
                details: { contentType: contentType, bodyPreview: String(apiResponse.data).substring(0, 200) }
            });
        }
    } catch (error) {
        console.error("Gemini enrich-gamelist request failed:", error.message);
        if (error.response) {
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;
            let errorDetails = responseData;

            if (contentType && contentType.includes('application/json')) {
                errorDetails = responseData.error || responseData; // Gemini often has a nested 'error' object
                res.status(error.response.status).json({
                    message: `Error from Gemini API (enrich): ${errorDetails.message || 'Unknown error'}`,
                    details: errorDetails
                });
            } else {
                console.error("Gemini enrich-gamelist error response was not JSON. Content-Type:", contentType);
                console.error("Gemini enrich-gamelist error response data:", responseData);
                res.status(error.response.status).json({
                    error: 'Error from Gemini API (enrich, non-JSON response).',
                    details: {
                        statusCode: error.response.status,
                        contentType: contentType,
                        bodyPreview: String(responseData).substring(0, 200)
                    }
                });
            }
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from Gemini API (enrich).' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while calling Gemini API for game list enrichment.' });
        }
    }
});

// Endpoint for RAWG API - Games List (Search)
app.get('/api/search/rawg/games', async (req, res) => {
    const { search, page, page_size } = req.query; // RAWG uses 'search'
    if (!search) {
        return res.status(400).json({ error: 'Query parameter "search" is required for RAWG.' });
    }
    if (!process.env.RAWG_API_KEY) {
        return res.status(500).json({ error: 'RAWG API key is not configured on the server.' });
    }

    const targetUrl = `https://api.rawg.io/api/games`;
    const params = {
        key: process.env.RAWG_API_KEY,
        search,
        ...(page && { page }),
        ...(page_size && { page_size }),
    };
    // RAWG's response is generally quite clean, so minimal transformation might be needed initially.
    // We can adapt this later based on frontend needs.
    try {
        const apiResponse = await axios.get(targetUrl, { params, timeout: EXTERNAL_API_TIMEOUT, headers: {'Accept': 'application/json'} });

        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data && apiResponse.data.results) { // RAWG uses a 'results' array
                const transformedGames = apiResponse.data.results.map(game => ({
                    id: game.id,
                    title: game.name,
                    slug: game.slug,
                    released: game.released,
                    rating: game.rating,
                    metacritic: game.metacritic,
                    background_image: game.background_image,
                    platforms: game.platforms.map(p => p.platform.name),
                    genres: game.genres.map(g => g.name),
                    stores: game.stores.map(s => s.store.name),
                }));

                res.json({
                    source: 'RAWG',
                    count: apiResponse.data.count,
                    next: apiResponse.data.next,
                    previous: apiResponse.data.previous,
                    games: transformedGames,
                });
            } else {
                // Still JSON, but not the expected structure
                console.warn("RAWG response was JSON but had unexpected structure:", apiResponse.data);
                res.status(200).json(apiResponse.data);
            }
        } else {
            // Non-JSON response from RAWG
            console.error("RAWG returned non-JSON response. Content-Type:", contentType);
            console.error("RAWG response data:", apiResponse.data);
            res.status(502).json({
                error: 'Bad Gateway: RAWG API returned non-JSON response.',
                details: {
                    contentType: contentType,
                    bodyPreview: String(apiResponse.data).substring(0, 200)
                }
            });
        }
    } catch (error) {
        console.error("RAWG games search request failed:", error.message);
        if (error.response) {
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;

            if (contentType && contentType.includes('application/json')) {
                // RAWG error responses might have a 'detail' field or just be the error object
                res.status(error.response.status).json(responseData.detail || responseData.error || responseData);
            } else {
                console.error("RAWG error response was not JSON. Content-Type:", contentType);
                console.error("RAWG error response data:", responseData);
                res.status(error.response.status).json({
                    error: 'Error from RAWG (non-JSON response).',
                    details: {
                        statusCode: error.response.status,
                        contentType: contentType,
                        bodyPreview: String(responseData).substring(0, 200)
                    }
                });
            }
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from RAWG.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while fetching from RAWG.' });
        }
    }
});

// Simple GET route for testing
app.get('/api/ping', (req, res) => {
  console.log('--- Received GET request at /api/ping ---');
  res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    // if (PROXY_SECRET) console.log("API endpoints are potentially protected by X-Proxy-Secret header (if enabled).");
    if (corsOptions.origin === '*') {
        console.warn("Warning: CORS is configured to allow all origins ('*'). For production, set FRONTEND_URL to your specific frontend domain in the .env file.");
    }
    if (!process.env.THEGAMESDB_API_KEY) console.warn("Warning: THEGAMESDB_API_KEY is not set. /api/search/thegamesdb/* endpoints will fail.");
    if (!process.env.RAWG_API_KEY) console.warn("Warning: RAWG_API_KEY is not set. /api/search/rawg/* endpoints will fail.");
    if (!process.env.GEMINI_API_KEY) console.warn("Warning: GEMINI_API_KEY is not set. /api/gemini/* endpoints will fail.");
    console.log(`External API timeout is set to ${EXTERNAL_API_TIMEOUT / 1000} seconds.`);
    console.log(`User ROMs base directory configured to: ${ROMS_BASE_DIRECTORY}`);
  });
}

// --- Game Launch Endpoint ---
import { spawn } from 'child_process'; // Import spawn

app.post('/api/games/launch', async (req, res) => {
    const { romPath, platformId, emulatorId } = req.body;

    if (!romPath || !platformId || !emulatorId) {
        return res.status(400).json({ error: 'Missing required fields: romPath, platformId, or emulatorId.' });
    }

    // Validate that romPath is not attempting directory traversal and is within an expected base directory.
    // THIS IS A CRITICAL SECURITY STEP.
    // For now, we'll assume romPath is an absolute path or relative to a known, safe root.
    // In a real app, you MUST validate this thoroughly. Example:
    // const safeRomPath = path.join(USER_CONFIGURED_ROMS_ROOT, romPath);
    // if (!fs.existsSync(safeRomPath) || !safeRomPath.startsWith(USER_CONFIGURED_ROMS_ROOT)) {
    //    return res.status(400).json({ error: 'Invalid or unsafe ROM path.' });
    // }
    // For this example, we'll proceed with romPath directly, but acknowledge the risk.
    if (romPath.includes('..')) {
         return res.status(400).json({ error: 'Invalid ROM path (directory traversal attempt detected).' });
    }


    // Load platforms data to find the emulator configuration
    let platformsData = [];
    try {
        if (fs.existsSync(PLATFORMS_FILE_PATH)) {
            const fileContent = await fs.promises.readFile(PLATFORMS_FILE_PATH, 'utf8');
            platformsData = JSON.parse(fileContent);
        } else {
            return res.status(500).json({ error: 'Platforms data file not found on server.' });
        }
    } catch (error) {
        console.error(`Error reading platforms data from ${PLATFORMS_FILE_PATH}:`, error);
        return res.status(500).json({ error: 'Failed to read platforms data on server.' });
    }

    const platform = platformsData.find(p => p.id.toString() === platformId.toString());
    if (!platform) {
        return res.status(404).json({ error: `Platform with ID ${platformId} not found.` });
    }

    const emulatorConfig = platform.emulators?.find(e => e.id === emulatorId);
    if (!emulatorConfig || !emulatorConfig.executablePath || !emulatorConfig.commandLineArgs) {
        return res.status(404).json({ error: `Emulator configuration with ID ${emulatorId} not found or incomplete for platform ${platform.name}.` });
    }

    // Construct the command
    // Replace placeholders like {romPath}, {emulatorPath}
    // Ensure romPath is properly quoted if it contains spaces.
    // For security, ensure executablePath is also validated or from a trusted source.
    const resolvedRomPath = path.resolve(romPath); // Resolve to absolute if it's relative

    // Basic path validation for executablePath (example, enhance for security)
    if (emulatorConfig.executablePath.includes('..')) {
        return res.status(400).json({ error: 'Invalid emulator executable path (directory traversal attempt detected).' });
    }
    // Further validation: ensure it's an executable, perhaps check against a list of allowed emulators.


    let command = emulatorConfig.commandLineArgs
        .replace(/{emulatorPath}/g, `"${emulatorConfig.executablePath}"`) // Quote for safety
        .replace(/{romPath}/g, `"${resolvedRomPath}"`); // Quote for safety

    // Split the command string into the executable and its arguments for spawn
    // This is a naive split by space, which might fail if paths have spaces and aren't quoted
    // A more robust solution would parse this carefully or store executable and args separately.
    // For now, we assume commandLineArgs is structured like: "{emulatorPath}" arg1 arg2 "{romPath}"

    // A safer approach for spawn:
    const executable = emulatorConfig.executablePath;
    const args = emulatorConfig.commandLineArgs
        .replace(/{emulatorPath}/g, '') // Remove placeholder itself if it's part of a larger template
        .replace(/{romPath}/g, resolvedRomPath) // Substitute ROM path
        .trim() // Remove leading/trailing whitespace
        .split(/\s+/) // Split by space, this needs to be smarter for args with spaces
        .filter(arg => arg.length > 0); // Remove empty strings

    // A more robust way to handle command line arguments, especially if they contain spaces,
    // is to define them as an array in the configuration or use a library for command parsing.
    // For now, this is a simplified example.

    console.log(`Executing command: ${executable} ${args.join(' ')}`);

    try {
        // Spawn the emulator process
        // Using detached: true and stdio: 'ignore' to let the emulator run independently of the server
        const child = spawn(executable, args, {
            detached: true,
            stdio: 'ignore', // Or 'inherit' if you want to see emulator output in server console
            shell: true // shell: true can be a security risk if command parts are user-supplied and not sanitized.
                        // It's used here for convenience with complex commands but consider alternatives.
                        // If shell: false, executable must be the direct path to the binary, and args is an array.
        });

        child.on('error', (err) => {
            console.error(`Failed to start emulator ${emulatorConfig.name}:`, err);
            // Note: This error event might not be enough if the process starts but then fails (e.g. bad ROM)
            // res.status(500).json({ error: `Failed to start emulator: ${err.message}` }); // Cannot send response here if already sent
        });

        child.unref(); // Allows the parent (server) to exit independently of the child

        res.status(200).json({ message: `Attempting to launch ${path.basename(romPath)} with ${emulatorConfig.name}.` });

    } catch (error) {
        console.error(`Error spawning emulator process for ${emulatorConfig.name}:`, error);
        res.status(500).json({ error: `Server error while trying to launch emulator: ${error.message}` });
    }
});


// --- Data Persistence Routes ---

const DATA_DIR = path.join(__dirname, 'data');
const PLATFORMS_FILE_PATH = path.join(DATA_DIR, 'platforms.json');
const GAMES_FILE_PATH = path.join(DATA_DIR, 'games.json');
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');

// Helper function to ensure data directory exists
const ensureDataDirExists = () => {
    if (!fs.existsSync(DATA_DIR)) {
        try {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`Created data directory: ${DATA_DIR}`);
        } catch (error) {
            console.error(`Error creating data directory ${DATA_DIR}:`, error);
        }
    }
};

// Ensure data directory exists on server startup
ensureDataDirExists();

// --- ROM Scanning Endpoint ---
const IGNORED_ROM_EXTENSIONS = ['.txt', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.mkv', '.mpg', '.avi', '.nfo'];

app.post('/api/scan-roms', async (req, res) => {
    const { platformId, folderPath } = req.body;

    if (!platformId || !folderPath) {
        return res.status(400).json({ error: 'Missing required fields: platformId or folderPath.' });
    }

    // Security: Basic validation to prevent directory traversal.
    // Resolve the path to normalize it (e.g., remove '..') and then check if it still tries to go "up".
    // This is a simplified check; a more robust solution might involve checking against a list of allowed base paths.
    const resolvedPath = path.resolve(folderPath);
    if (resolvedPath.includes('..')) {
        return res.status(400).json({ error: 'Invalid folder path: Directory traversal detected.' });
    }
    // Further check: ensure the resolved path does not navigate "above" a conceptual root if you have one.
    // For example, if all ROMs must be under /mnt/roms:
    // const SAFE_BASE = '/mnt/roms'; // This should be configurable or derived
    // if (!resolvedPath.startsWith(SAFE_BASE)) {
    //    return res.status(400).json({ error: 'Invalid folder path: Path is outside allowed directories.' });
    // }


    try {
        // Check if the path exists and is a directory
        const stats = await fs.promises.stat(resolvedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: `Specified path is not a directory: ${resolvedPath}` });
        }

        const dirents = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
        const potentialRomFiles = [];

        for (const dirent of dirents) {
            if (dirent.isFile()) {
                const ext = path.extname(dirent.name).toLowerCase();
                if (!IGNORED_ROM_EXTENSIONS.includes(ext)) {
                    potentialRomFiles.push({
                        name: path.parse(dirent.name).name, // Filename without extension
                        filename: dirent.name // Full filename with extension
                    });
                }
            }
        }

        console.log(`Scan for platform ${platformId} in ${resolvedPath} found ${potentialRomFiles.length} potential ROMs.`);
        res.status(200).json(potentialRomFiles);

    } catch (error) {
        console.error(`Error scanning ROMs folder ${resolvedPath} for platform ${platformId}:`, error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: `Folder not found: ${resolvedPath}` });
        } else if (error.code === 'EACCES') {
            return res.status(403).json({ error: `Permission denied for folder: ${resolvedPath}` });
        }
        res.status(500).json({ error: 'Failed to scan ROMs folder due to a server error.', details: error.message });
    }
});


// Endpoint to load games data
app.get('/api/data/games', async (req, res) => {
    try {
        if (fs.existsSync(GAMES_FILE_PATH)) {
            const fileContent = await fs.promises.readFile(GAMES_FILE_PATH, 'utf8');
            const gamesData = JSON.parse(fileContent);
            res.status(200).json(gamesData);
        } else {
            console.log(`${GAMES_FILE_PATH} not found. Returning empty array for games.`);
            res.status(200).json([]);
        }
    } catch (error) {
        console.error(`Error reading games data from ${GAMES_FILE_PATH}:`, error);
        res.status(200).json([]);
    }
});

// Endpoint to load platforms data
app.get('/api/data/platforms', async (req, res) => {
    try {
        if (fs.existsSync(PLATFORMS_FILE_PATH)) {
            const fileContent = await fs.promises.readFile(PLATFORMS_FILE_PATH, 'utf8');
            const platformsData = JSON.parse(fileContent);
            res.status(200).json(platformsData);
        } else {
            console.log(`${PLATFORMS_FILE_PATH} not found. Returning empty array for platforms.`);
            res.status(200).json([]);
        }
    } catch (error) {
        console.error(`Error reading platforms data from ${PLATFORMS_FILE_PATH}:`, error);
        res.status(200).json([]);
    }
});

// Endpoint to save platforms data
app.post('/api/data/platforms', async (req, res) => {
    const platformsData = req.body;

    if (!Array.isArray(platformsData)) {
        return res.status(400).json({ error: 'Invalid data format: Expected an array of platforms.' });
    }

    try {
        const jsonString = JSON.stringify(platformsData, null, 2);
        await fs.promises.writeFile(PLATFORMS_FILE_PATH, jsonString, 'utf8');
        console.log(`Platforms data successfully saved to ${PLATFORMS_FILE_PATH}`);
        res.status(200).json({ message: 'Platforms data saved successfully.' });
    } catch (error) {
        console.error(`Error saving platforms data to ${PLATFORMS_FILE_PATH}:`, error);
        res.status(500).json({ error: 'Failed to save platforms data.', details: error.message });
    }
});

// Endpoint to save games data
app.post('/api/data/games', async (req, res) => {
    console.log('--- Received POST request at /api/data/games: ---');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const gamesData = req.body;

    if (!Array.isArray(gamesData)) {
        return res.status(400).json({ error: 'Invalid data format: Expected an array of games.' });
    }

    try {
        const jsonString = JSON.stringify(gamesData, null, 2);
        await fs.promises.writeFile(GAMES_FILE_PATH, jsonString, 'utf8');
        console.log(`Games data successfully saved to ${GAMES_FILE_PATH}`);
        res.status(200).json({ message: 'Games data saved successfully.' });
    } catch (error) {
        console.error(`Error saving games data to ${GAMES_FILE_PATH}:`, error);
        res.status(500).json({ error: 'Failed to save games data.', details: error.message });
    }
});

// Endpoint to get API keys from .env
app.get('/api/env/keys', async (req, res) => {
    try {
        const envFileContent = await fs.promises.readFile(ENV_FILE_PATH, 'utf8');
        const envConfig = dotenv.parse(envFileContent);
        res.status(200).json(envConfig);
    } catch (error) {
        console.error('Error reading API keys from .env file:', error);
        res.status(500).json({ error: 'Failed to read API keys.' });
    }
});

// Endpoint to update API keys in .env file
app.post('/api/env/keys', async (req, res) => {
    const newKeys = req.body;

    try {
        let envFileContent = '';
        if (fs.existsSync(ENV_FILE_PATH)) {
            envFileContent = await fs.promises.readFile(ENV_FILE_PATH, 'utf8');
        }

        const updateEnvVariable = (content, key, value) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(content)) {
                return content.replace(regex, `${key}=${value}`);
            } else {
                return `${content}\n${key}=${value}`;
            }
        };

        for (const [key, value] of Object.entries(newKeys)) {
            envFileContent = updateEnvVariable(envFileContent, key, value);
        }

        await fs.promises.writeFile(ENV_FILE_PATH, envFileContent.trim(), 'utf8');
        
        console.log(`API keys successfully updated in ${ENV_FILE_PATH}`);
        res.status(200).json({ message: 'API keys updated successfully. Restart the server for changes to take effect.' });
    } catch (error) {
        console.error(`Error saving API keys to ${ENV_FILE_PATH}:`, error);
        res.status(500).json({ error: 'Failed to save API keys.', details: error.message });
    }
});

export { app }; // Export the app instance