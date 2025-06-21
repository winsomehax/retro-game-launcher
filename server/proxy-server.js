import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { URL } from 'url'; // Import URL for parsing

dotenv.config(); // For loading .env file from the project root

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuration ---
const corsOptions = {
    // In production, restrict this to your frontend's actual domain
    origin: process.env.FRONTEND_URL || '*',
    // You might want to specify methods and headers allowed if needed
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization"
};

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;
if (!EXTERNAL_API_KEY) {
    console.warn("Warning: EXTERNAL_API_KEY is not set in the .env file. Calls to protected external APIs may fail.");
}

const PROXY_SECRET = process.env.PROXY_SECRET;
const EXTERNAL_API_TIMEOUT = parseInt(process.env.EXTERNAL_API_TIMEOUT, 10) || 10000; // Default 10s

// --- Middleware ---
app.use(cors(corsOptions)); // Enable CORS with configured options
app.use(express.json());   // To parse JSON request bodies

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
                return {
                    id: game.id,
                    title: game.game_title,
                    release_date: game.release_date,
                    platform_id: game.platform, // Platform ID, frontend might need to map this to name
                    // platform_name: apiResponse.data.include?.platform?.data?.[game.platform]?.name, // Example if platform details were included
                    overview: game.overview,
                    players: game.players,
                    genres: game.genres, // This will be array of genre IDs, might need further mapping
                    rating: game.rating,
                    boxart_url: boxartUrl,
                    // Add other fields as needed
                };
            });

            res.json({
                source: 'TheGamesDB',
                count: apiResponse.data.data.count,
                games: transformedGames,
                pages: apiResponse.data.pages, // Forward pagination info
                remaining_allowance: apiResponse.data.remaining_monthly_allowance
            });
        } else {
            res.json(apiResponse.data); // Return original if structure is unexpected
        }
    } catch (error) {
        console.error("TheGamesDB ByGameName request failed:", error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from TheGamesDB.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while fetching from TheGamesDB.' });
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
        const apiResponse = await axios.get(targetUrl, { params, timeout: EXTERNAL_API_TIMEOUT });
         const transformedGames = apiResponse.data.results.map(game => ({
            id: game.id,
            title: game.name,
            slug: game.slug,
            released: game.released,
            rating: game.rating,
            metacritic: game.metacritic,
            background_image: game.background_image,
            platforms: game.platforms.map(p => p.platform.name), // Extract platform names
            genres: game.genres.map(g => g.name), // Extract genre names
            stores: game.stores.map(s => s.store.name), // Extract store names
        }));

        res.json({
            source: 'RAWG',
            count: apiResponse.data.count,
            next: apiResponse.data.next,
            previous: apiResponse.data.previous,
            games: transformedGames,
        });
    } catch (error) {
        console.error("RAWG games search request failed:", error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
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

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
    // Using gemini-pro as an example, adjust model as needed e.g. gemini-2.0-flash
    // The Gemini API expects the key in the URL for POST requests.

    // Gemini response is usually fine, but we can select parts if needed.
    // For example, just returning the first candidate's text part.
    try {
        const apiResponse = await axios.post(targetUrl, { contents }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: EXTERNAL_API_TIMEOUT,
        });

        if (apiResponse.data.candidates && apiResponse.data.candidates.length > 0) {
            const firstCandidateText = apiResponse.data.candidates[0].content.parts[0].text;
            res.json({
                source: 'Gemini',
                generated_text: firstCandidateText,
                full_response: apiResponse.data // Optionally include full response for debugging/more data
            });
        } else {
            res.json(apiResponse.data); // Return as is if structure is not as expected
        }
    } catch (error) {
        console.error("Gemini generateContent request failed:", error.message);
        if (error.response) {
            // Gemini often returns detailed errors in error.response.data.error
            const errData = error.response.data.error || error.response.data;
            res.status(error.response.status).json({
                message: `Error from Gemini API: ${errData.message || 'Unknown error'}`,
                details: errData
            });
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from Gemini API.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while calling Gemini API.' });
        }
    }
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