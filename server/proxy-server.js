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

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuration ---
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Default to common Vite frontend dev port
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization"
};

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY; // General key, might not be used if specific keys are present
const PROXY_SECRET = process.env.PROXY_SECRET;
const EXTERNAL_API_TIMEOUT = parseInt(process.env.EXTERNAL_API_TIMEOUT, 10) || 10000; // Default 10s

// --- TheGamesDB Platforms Cache ---
const TGDB_PLATFORMS_CACHE_PATH = path.join(__dirname, 'thegamesdb_platforms.json');
const TGDB_API_KEY = process.env.THEGAMESDB_API_KEY;
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
        ...(page && { page }) // Add page if provided
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
    const prompt = `For the following game titles: ${gameTitles}, provide a short, engaging description for each, suitable for a game library. Return the data as a JSON array where each object has "title" and "description" fields.`;

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


// Endpoint for Gemini API - Generate Content
app.post('/api/gemini/generatecontent', async (req, res) => {
    const { contents } = req.body; // Expecting body like: { "contents": [{"parts": [{"text": "Your prompt"}]}] }
    if (!contents) {
        return res.status(400).json({ error: 'Request body must contain "contents" field.' });
    }
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest'; // Allow override via env var
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    console.log(`Proxying to Gemini model: ${modelName}`);
    // The Gemini API expects the key in the URL for POST requests.

    // Gemini response is usually fine, but we can select parts if needed.
    // For example, just returning the first candidate's text part.
    try {
        const apiResponse = await axios.post(targetUrl, { contents }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: EXTERNAL_API_TIMEOUT,
        });

        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data.candidates && apiResponse.data.candidates.length > 0 &&
                apiResponse.data.candidates[0].content && apiResponse.data.candidates[0].content.parts &&
                apiResponse.data.candidates[0].content.parts.length > 0 &&
                typeof apiResponse.data.candidates[0].content.parts[0].text !== 'undefined') {

                const firstCandidateText = apiResponse.data.candidates[0].content.parts[0].text;
                res.json({
                    source: 'Gemini',
                    generated_text: firstCandidateText,
                    full_response: apiResponse.data
                });
            } else {
                // Still JSON, but not the expected structure
                console.warn("Gemini generateContent response was JSON but had unexpected structure:", apiResponse.data);
                res.status(200).json(apiResponse.data);
            }
        } else {
             // Non-JSON response from Gemini
            console.error("Gemini generateContent returned non-JSON response. Content-Type:", contentType);
            console.error("Gemini generateContent response data:", apiResponse.data);
            res.status(502).json({
                error: 'Bad Gateway: Gemini API (generate) returned non-JSON response.',
                details: {
                    contentType: contentType,
                    bodyPreview: String(apiResponse.data).substring(0, 200)
                }
            });
        }

    } catch (error) {
        console.error("Gemini generateContent request failed:", error.message);
        if (error.response) {
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;
            let errorDetails = responseData;

            if (contentType && contentType.includes('application/json')) {
                errorDetails = responseData.error || responseData; // Gemini often has a nested 'error' object
                 res.status(error.response.status).json({
                    message: `Error from Gemini API (generate): ${errorDetails.message || 'Unknown error'}`,
                    details: errorDetails
                });
            } else {
                console.error("Gemini generateContent error response was not JSON. Content-Type:", contentType);
                console.error("Gemini generateContent error response data:", responseData);
                res.status(error.response.status).json({
                    error: 'Error from Gemini API (generate, non-JSON response).',
                    details: {
                        statusCode: error.response.status,
                        contentType: contentType,
                        bodyPreview: String(responseData).substring(0, 200)
                    }
                });
            }
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from Gemini API (generate).' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while calling Gemini API (generate).' });
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
});

// --- Data Persistence Routes ---

const DATA_DIR = path.join(__dirname, 'data');
const PLATFORMS_FILE_PATH = path.join(DATA_DIR, 'platforms.json');
const GAMES_FILE_PATH = path.join(DATA_DIR, 'games.json');
// const EMULATORS_FILE_PATH = path.join(DATA_DIR, 'emulators.json'); // Placeholder for when we add emulators

// Helper function to ensure data directory exists
const ensureDataDirExists = () => {
    if (!fs.existsSync(DATA_DIR)) {
        try {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`Created data directory: ${DATA_DIR}`);
        } catch (error) {
            console.error(`Error creating data directory ${DATA_DIR}:`, error);
            // If the directory can't be made, saving will fail.
            // Depending on requirements, we might throw here or let save attempts fail.
        }
    }
};

// Ensure data directory exists on server startup
ensureDataDirExists();

// Endpoint to load games data
app.get('/api/data/games', async (req, res) => {
    try {
        if (fs.existsSync(GAMES_FILE_PATH)) {
            const fileContent = await fs.promises.readFile(GAMES_FILE_PATH, 'utf8');
            const gamesData = JSON.parse(fileContent);
            res.status(200).json(gamesData);
        } else {
            console.log(`${GAMES_FILE_PATH} not found. Returning empty array for games.`);
            res.status(200).json([]); // Return empty array if file doesn't exist
        }
    } catch (error) {
        console.error(`Error reading games data from ${GAMES_FILE_PATH}:`, error);
        // If file exists but is corrupt or other read error, also return empty array for robustness on client
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
            res.status(200).json([]); // Return empty array if file doesn't exist
        }
    } catch (error) {
        console.error(`Error reading platforms data from ${PLATFORMS_FILE_PATH}:`, error);
        res.status(200).json([]);
    }
});

// Endpoint to save platforms data
app.post('/api/data/platforms', async (req, res) => {
    const platformsData = req.body; // Expecting an array of platform objects

    if (!Array.isArray(platformsData)) {
        return res.status(400).json({ error: 'Invalid data format: Expected an array of platforms.' });
    }

    try {
        // Convert the array to a JSON string with pretty printing
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
    console.log('--- Received POST request at /api/data/games: ---'); // Re-added log
    console.log('Request body:', JSON.stringify(req.body, null, 2));    // Re-added log
    const gamesData = req.body; // Expecting an array of game objects

    if (!Array.isArray(gamesData)) {
        return res.status(400).json({ error: 'Invalid data format: Expected an array of games.' });
    }

    try {
        // Convert the array to a JSON string with pretty printing
        const jsonString = JSON.stringify(gamesData, null, 2);
        await fs.promises.writeFile(GAMES_FILE_PATH, jsonString, 'utf8');
        console.log(`Games data successfully saved to ${GAMES_FILE_PATH}`);
        res.status(200).json({ message: 'Games data saved successfully.' });
    } catch (error) {
        console.error(`Error saving games data to ${GAMES_FILE_PATH}:`, error);
        res.status(500).json({ error: 'Failed to save games data.', details: error.message });
    }
});