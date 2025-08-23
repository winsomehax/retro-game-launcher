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

        // Initialize cache directory later when app is ready
        this.cacheDir = null;
        
        // Download counter
        this.downloadCount = 0;
    }

    async initialize() {
        if (!this.cacheDir) {
            this.cacheDir = this.path.join(this.app.getPath('userData'), 'asset-cache');
            await this.ensureCacheDir();
        }
    }

    async ensureCacheDir() {
        if (!this.cacheDir) {
            this.cacheDir = this.path.join(this.app.getPath('userData'), 'asset-cache');
        }
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
     * Normalizes a URL by removing authentication parameters that change between requests.
     * @param {string} url - The URL to normalize.
     * @returns {string} - The normalized URL.
     */
    normalizeUrl(url) {
        let normalizedUrl = url;
        
        try {
            const urlObj = new URL(url);
            const searchParams = urlObj.searchParams;
            
            // Remove authentication parameters that change between requests
            searchParams.delete('devid');
            searchParams.delete('devpassword');
            searchParams.delete('softname');
            searchParams.delete('ssid');
            searchParams.delete('sspassword');
            
            // Reconstruct the URL with cleaned parameters
            urlObj.search = searchParams.toString();
            normalizedUrl = urlObj.toString();
        } catch (error) {
            // If URL parsing fails, just remove common authentication parameters from the string
            normalizedUrl = url
                .replace(/[?&]devid=[^&]*(&|$)/g, '$1')
                .replace(/[?&]devpassword=[^&]*(&|$)/g, '$1')
                .replace(/[?&]softname=[^&]*(&|$)/g, '$1')
                .replace(/[?&]ssid=[^&]*(&|$)/g, '$1')
                .replace(/[?&]sspassword=[^&]*(&|$)/g, '$1')
                .replace(/\?$/, ''); // Remove trailing ? if no params left
            
            // Clean up any double &'s or leading &'s
            normalizedUrl = normalizedUrl
                .replace(/&&/g, '&')
                .replace(/\?&/, '?');
        }
        
        return normalizedUrl;
    }

    /**
     * Generates a unique filename for a given URL using a hash.
     * @param {string} url - The URL of the asset.
     * @param {Response} response - The fetch response object (optional).
     * @returns {string} - The hashed filename.
     */
    generateFilename(url, response = null) {
        const normalizedUrl = this.normalizeUrl(url);
        const hash = this.crypto.createHash('md5').update(normalizedUrl).digest('hex');
        const ext = this.getFileExtension(url, response);
        return `${hash}${ext}`;
    }

    /**
     * Checks if an asset is already cached locally.
     * @param {string} url - The URL of the asset.
     * @returns {Promise<{exists: boolean, path: string}>} - Object indicating if the asset exists and its path.
     */
    async isCached(url) {
        // Ensure cache directory is initialized
        if (!this.cacheDir) {
            this.cacheDir = this.path.join(this.app.getPath('userData'), 'asset-cache');
        }
        
        // Try to find the cached file by checking if any file with the same hash prefix exists
        const normalizedUrl = this.normalizeUrl(url);
        const hash = this.crypto.createHash('md5').update(normalizedUrl).digest('hex');
        
        // Look for any file in the cache directory that starts with this hash
        try {
            const files = await this.fs.readdir(this.cacheDir);
            const matchingFiles = files.filter(file => file.startsWith(hash));
            
            if (matchingFiles.length > 0) {
                // Use the first matching file (there should only be one)
                const filepath = this.path.join(this.cacheDir, matchingFiles[0]);
                
                // Validate the path to prevent path traversal
                const validatedPath = this.validatePath(filepath, this.cacheDir);
                if (validatedPath) {
                    await this.fs.access(validatedPath);
                    console.log(`Asset found in cache: ${url.replace(/[\x00-\x1F\x7F]/g, '')} -> ${validatedPath.replace(/[\x00-\x1F\x7F]/g, '')}`);
                    return { exists: true, path: validatedPath };
                }
            }
        } catch (error) {
            // Ignore readdir/access errors, treat as not cached
        }
        
        console.log(`Asset not in cache: ${url.replace(/[\x00-\x1F\x7F]/g, '')}`);
        return { exists: false, path: this.path.join(this.cacheDir, `${hash}.dat`) };
    }

    /**
     * Downloads an asset from a URL and saves it to the cache.
     * @param {string} url - The URL of the asset to download.
     * @returns {Promise<string|null>} - The local file path of the cached asset, or null on failure.
     */
    async downloadAsset(url) {
        // Ensure cache directory is initialized
        if (!this.cacheDir) {
            this.cacheDir = this.path.join(this.app.getPath('userData'), 'asset-cache');
        }
        
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

            // Increment download counter
            this.downloadCount++;
            
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

    /**
     * Gets the number of assets downloaded during this session.
     * @returns {number} - The download count.
     */
    getDownloadCount() {
        return this.downloadCount;
    }
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

    /**
     * Gets the local path for an asset, downloading it if necessary.
     * @param {string} url - The URL of the asset.
     * @returns {Promise<string|null>} - The local file path of the asset, or null on failure.
     */
    async getAssetPath(url) {
        if (!url) return null;
        
        // Ensure cache directory is initialized
        if (!this.cacheDir) {
            this.cacheDir = this.path.join(this.app.getPath('userData'), 'asset-cache');
        }

        // Check if the URL is already a local file path that exists
        if ((url.startsWith('/') || /^[A-Za-z]:/.test(url)) && url.includes(this.cacheDir)) {
            // Validate the path to prevent path traversal
            const validatedPath = this.validatePath(url, this.cacheDir);
            if (!validatedPath) {
                return null;
            }
            
            // Continue with normal processing - skip the file existence check
        }

        const { exists, path: filepath } = await this.isCached(url);
        
        if (exists) {
            return filepath;
        }

        return await this.downloadAsset(url);
    }

    /**
     * Gets the number of assets downloaded during this session.
     * @returns {number} - The download count.
     */
    getDownloadCount() {
        return this.downloadCount;
    }
}

module.exports = AssetManager;