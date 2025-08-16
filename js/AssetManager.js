const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { net } = require('electron');

class AssetManager {
    constructor() {
        this.cacheDir = path.join(app.getPath('userData'), 'asset-cache');
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create asset cache directory:', error);
        }
    }

    /**
     * Determines the appropriate file extension based on the URL or content type.
     * @param {string} url - The URL of the asset.
     * @param {Response} response - The fetch response object (optional).
     * @returns {string} - The file extension.
     */
    getFileExtension(url, response = null) {
        // Check if this is a local file path (starts with / or a drive letter on Windows)
        const isLocalPath = url.startsWith('/') || /^[A-Za-z]:/.test(url);
        
        // Try to get extension from URL first
        let ext = '';
        if (isLocalPath) {
            // For local paths, use path.extname directly
            ext = path.extname(url);
        } else {
            try {
                // For URLs, try to parse with URL constructor
                ext = path.extname(new URL(url).pathname);
            } catch (error) {
                // If URL parsing fails, fall back to path.extname
                ext = path.extname(url);
            }
        }
        
        // If the extension is .php or other server-side extensions, we need to look deeper
        if (ext === '.php' || ext === '.asp' || ext === '.aspx' || ext === '.jsp') {
            ext = '';
        }
        
        // If no extension in URL path, try to determine from Content-Type header
        if (!ext && response) {
            const contentType = response.headers.get('content-type');
            if (contentType) {
                if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
                    ext = '.jpg';
                } else if (contentType.includes('image/png')) {
                    ext = '.png';
                } else if (contentType.includes('image/gif')) {
                    ext = '.gif';
                } else if (contentType.includes('video/mp4')) {
                    ext = '.mp4';
                }
            }
        }
        
        // If still no extension, default to .jpg for images (common case for ScreenScraper)
        if (!ext) {
            // Check if URL suggests it's an image or video
            if (url.includes('media=ss') || url.includes('media=box') || url.includes('media=photo') || 
                url.includes('media=screen') || url.includes('media=mix') || url.includes('media=wheel') ||
                url.includes('media=background') || url.includes('media=cover')) {
                ext = '.jpg';
            } else if (url.includes('media=video')) {
                ext = '.mp4';
            } else {
                ext = '.dat'; // Default fallback
            }
        }
        
        return ext;
    }

    /**
     * Generates a unique filename for a given URL using a hash.
     * @param {string} url - The URL of the asset.
     * @param {Response} response - The fetch response object (optional).
     * @returns {string} - The hashed filename.
     */
    generateFilename(url, response = null) {
        const hash = crypto.createHash('md5').update(url).digest('hex');
        const ext = this.getFileExtension(url, response);
        return `${hash}${ext}`;
    }

    /**
     * Checks if an asset is already cached locally.
     * @param {string} url - The URL of the asset.
     * @returns {Promise<{exists: boolean, path: string}>} - Object indicating if the asset exists and its path.
     */
    async isCached(url) {
        const filename = this.generateFilename(url);
        const filepath = path.join(this.cacheDir, filename);
        
        try {
            await fs.access(filepath);
            return { exists: true, path: filepath };
        } catch {
            return { exists: false, path: filepath };
        }
    }

    /**
     * Downloads an asset from a URL and saves it to the cache.
     * @param {string} url - The URL of the asset to download.
     * @returns {Promise<string|null>} - The local file path of the cached asset, or null on failure.
     */
    async downloadAsset(url) {
        try {
            const { exists, path: filepath } = await this.isCached(url);
            
            if (exists) {
                console.log(`Asset already cached: ${url}`);
                return filepath;
            }

            console.log(`Downloading asset: ${url}`);
            const response = await net.fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Log response details for debugging
            console.log(`Response status: ${response.status}`);
            console.log(`Response headers:`, [...response.headers.entries()]);
            
            const buffer = await response.arrayBuffer();
            // Generate filename with response information for proper extension
            const filename = this.generateFilename(url, response);
            const finalFilepath = path.join(this.cacheDir, filename);
            
            await fs.writeFile(finalFilepath, Buffer.from(buffer));
            
            console.log(`Asset downloaded and cached: ${url} -> ${finalFilepath} (size: ${buffer.byteLength} bytes)`);
            return finalFilepath;
        } catch (error) {
            console.error(`Failed to download asset from ${url}:`, error);
            return null;
        }
    }

    /**
     * Gets the local path for an asset, downloading it if necessary.
     * @param {string} url - The URL of the asset.
     * @returns {Promise<string|null>} - The local file path of the asset, or null on failure.
     */
    async getAssetPath(url) {
        if (!url) return null;

        // Check if the URL is already a local file path that exists
        if ((url.startsWith('/') || /^[A-Za-z]:/.test(url)) && url.includes(this.cacheDir)) {
            try {
                await fs.access(url);
                return url;
            } catch {
                // File doesn't exist, continue with normal processing
            }
        }

        const { exists, path: filepath } = await this.isCached(url);
        
        if (exists) {
            return filepath;
        }

        return await this.downloadAsset(url);
    }
}

module.exports = AssetManager;