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
if (PROXY_SECRET) {
    app.use('/api/proxy', (req, res, next) => {
        const clientSecret = req.headers['x-proxy-secret'];
        if (clientSecret === PROXY_SECRET) {
            next();
        } else {
            console.warn('Access denied to /api/proxy due to missing or invalid X-Proxy-Secret header.');
            res.status(403).json({ error: 'Forbidden: Invalid or missing proxy secret.' });
        }
    });
}

// --- Routes ---
// Generic proxy endpoint
app.post('/api/proxy', async (req, res) => {
    const { method, url, data, headers: clientHeaders } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Target URL (url) is required in the request body.' });
    }

    // IMPORTANT SECURITY: Validate or whitelist the 'url' parameter here
    // to prevent SSRF attacks or abuse. For example:
    // const allowedDomains = ['api.example.com', 'another.trusted.api'];
    // try {
    //   const targetHostname = new URL(url).hostname;
    //   if (!allowedDomains.includes(targetHostname)) {
    //     return res.status(403).json({ error: 'Forbidden: Target domain not allowed.' });
    //   }
    // } catch (e) {
    //   return res.status(400).json({ error: 'Invalid target URL format.' });
    // }

    try {
        const requestHeaders = {};
        // Carefully select which headers to forward from the client to the external API
        if (clientHeaders) {
            if (clientHeaders['content-type']) requestHeaders['Content-Type'] = clientHeaders['content-type'];
            if (clientHeaders['accept']) requestHeaders['Accept'] = clientHeaders['accept'];
            // Add other specific headers you need to forward
        }

        // Add your API key for the external service
        if (EXTERNAL_API_KEY) {
            requestHeaders['Authorization'] = `Bearer ${EXTERNAL_API_KEY}`; // Common pattern
            // Or: requestHeaders['X-API-Key'] = EXTERNAL_API_KEY; // Depending on the API
        }

        const response = await axios({
            method: method || 'GET', // Default to GET
            url: url,
            data: data,
            headers: requestHeaders,
            timeout: EXTERNAL_API_TIMEOUT,
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Proxy request to", url, "failed:", error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: No response from target server.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error while proxying request.' });
        }
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`API proxy server running on http://localhost:${PORT}`);
    if (PROXY_SECRET) console.log("Proxy endpoint /api/proxy is protected by X-Proxy-Secret header.");
    if (corsOptions.origin === '*') console.warn("Warning: CORS is configured to allow all origins ('*'). For production, set FRONTEND_URL to your specific frontend domain in the .env file.");
    console.log(`External API timeout is set to ${EXTERNAL_API_TIMEOUT / 1000} seconds.`);
});