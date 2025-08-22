class AssetManager {
    constructor() {
        const { app } = require('electron');
        const path = require('path');
        const fs = require('fs').promises;
        const crypto = require('crypto');
        const { net } = require('electron');

        this.app = app;
        this.path = path;
        this.fs = fs;
        this.crypto = crypto;
        this.net = net;

        this.cacheDir = this.path.join(this.app.getPath('userData'), 'asset-cache');
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        try {
            await this.fs.mkdir(this.cacheDir, { recursive: true });
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
            ext = this.path.extname(url);
        } else {
            try {
                // For URLs, try to parse with URL constructor and remove query parameters
                const parsedUrl = new URL(url);
                const pathname = parsedUrl.pathname;
                ext = this.path.extname(pathname);
            } catch (error) {
                // If URL parsing fails, fall back to path.extname on the URL without query params
                const cleanUrl = url.split('?')[0];
                ext = this.path.extname(cleanUrl);
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
        const hash = this.crypto.createHash('md5').update(url).digest('hex');
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
        const filepath = this.path.join(this.cacheDir, filename);
        
        // Validate the path to prevent path traversal
        const validatedPath = this.validatePath(filepath, this.cacheDir);
        if (!validatedPath) {
            return { exists: false, path: filepath };
        }
        
        try {
            await this.fs.access(validatedPath);
            return { exists: true, path: validatedPath };
        } catch {
            return { exists: false, path: validatedPath };
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
                console.log(`Asset already cached: ${url.replace(/[\x00-\x1F\x7F]/g, '')}`);
                return filepath;
            }

            // Validate the path to prevent path traversal
            const validatedPath = this.validatePath(filepath, this.cacheDir);
            if (!validatedPath) {
                return null;
            }

            console.log(`Downloading asset: ${url.replace(/[\x00-\x1F\x7F]/g, '')}`);
            const response = await this.net.fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Log response details for debugging
            console.log(`Response status: ${response.status}`);
            console.log(`Response headers:`, [...response.headers.entries()]);
            
            const buffer = await response.arrayBuffer();
            // Generate filename with response information for proper extension
            const filename = this.generateFilename(url, response);
            const finalFilepath = this.path.join(this.cacheDir, filename);
            
            // Validate the final path to prevent path traversal
            const validatedFinalPath = this.validatePath(finalFilepath, this.cacheDir);
            if (!validatedFinalPath) {
                return null;
            }
            
            await this.fs.writeFile(validatedFinalPath, Buffer.from(buffer));
            
            console.log(`Asset downloaded and cached: ${url.replace(/[\x00-\x1F\x7F]/g, '')} -> ${validatedFinalPath.replace(/[\x00-\x1F\x7F]/g, '')} (size: ${buffer.byteLength} bytes)`);
            return validatedFinalPath;
        } catch (error) {
            console.error(`Failed to download asset from ${url.replace(/[\x00-\x1F\x7F]/g, '')}:`, error);
            return null;
        }
    }

    /**\n     * Validates and resolves file paths to prevent path traversal attacks.\n     * @param {string} inputPath - The input path to validate.\n     * @param {string} baseDir - The base directory to resolve against.\n     * @returns {string|null} - The resolved path or null if invalid.\n     */
    validatePath(inputPath, baseDir) {
        try {
            // Resolve the path to handle relative paths
            let resolvedPath = this.path.resolve(inputPath);
            
            // Ensure the path is within the base directory
            const resolvedBase = this.path.resolve(baseDir);
            if (!resolvedPath.startsWith(resolvedBase)) {
                console.error('Path traversal attempt detected:', inputPath.replace(/[\x00-\x1F\x7F]/g, ''));
                return null;
            }
            
            // Allow access to the asset cache directory (which is within userData)
            // The asset cache is a legitimate subdirectory of the base directory
            if (resolvedPath.startsWith(this.cacheDir)) {
                return resolvedPath;
            }
            
            // Prevent access to sensitive system directories outside of our app directory
            // Only block access if the path is NOT within our application's data directory
            const appDataDir = this.path.resolve(this.app.getPath('userData'));
            if (!resolvedPath.startsWith(appDataDir)) {
                const sensitivePaths = ['/etc/', '/root/', '/usr/', '/var/'];
                for (const sensitivePath of sensitivePaths) {
                    if (resolvedPath.startsWith(sensitivePath)) {
                        console.error('Access to sensitive system directories is forbidden:', inputPath.replace(/[\x00-\x1F\x7F]/g, ''));
                        return null;
                    }
                }
            }
            
            return resolvedPath;
        } catch (error) {
            console.error('Error validating path:', error);
            return null;
        }
    }

    /**\n     * Gets the local path for an asset, downloading it if necessary.\n     * @param {string} url - The URL of the asset.\n     * @returns {Promise<string|null>} - The local file path of the asset, or null on failure.\n     */
    async getAssetPath(url) {
        if (!url) return null;

        // Check if the URL is already a local file path that exists
        if ((url.startsWith('/') || /^[A-Za-z]:/.test(url)) && url.includes(this.cacheDir)) {
            // Validate the path to prevent path traversal
            const validatedPath = this.validatePath(url, this.cacheDir);
            if (!validatedPath) {
                return null;
            }
            
            try {
                await this.fs.access(validatedPath);
                return validatedPath;
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