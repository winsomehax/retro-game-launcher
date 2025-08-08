const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Manages a ROM collection, wrapping ScreenScraperAPI to process data into structured objects
 * and store them in a JSON file.
 */
class RomManager {
    #api; // ScreenScraperAPI instance
    #storagePath; // Path to JSON storage file
    #collection; // In-memory collection: { games: [], lastUpdated: string }

    /**
     * Creates a RomManager instance.
     * @param {ScreenScraperAPI} api - The ScreenScraper API instance.
     * @param {string} storagePath - Path to the JSON storage file.
     */
    constructor(api, storagePath) {
        if (!api) throw new Error("ScreenScraperAPI instance is required.");
        if (!storagePath) throw new Error("Storage path is required.");
        this.#api = api;
        this.#storagePath = storagePath;
        this.#collection = { games: [], lastUpdated: new Date().toISOString() };
    }

    /**
     * Loads the collection from the JSON file.
     * @returns {Promise<void>}
     */
    async loadCollection() {
        try {
            const data = await fs.readFile(this.#storagePath, 'utf8');
            this.#collection = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.#saveCollection(); // Create empty file if not exists
            } else {
                throw new Error(`Failed to load collection: ${error.message}`);
            }
        }
    }

    /**
     * Saves the collection to the JSON file.
     * @private
     */
    async #saveCollection() {
        this.#collection.lastUpdated = new Date().toISOString();
        await fs.writeFile(this.#storagePath, JSON.stringify(this.#collection, null, 2));
    }

    /**
     * Computes hashes (CRC32, MD5, SHA1) for a ROM file.
     * @param {string} filePath - Path to the ROM file.
     * @returns {Promise<{crc: string, md5: string, sha1: string}>}
     * @private
     */
    async #computeRomHashes(filePath) {
        const buffer = await fs.readFile(filePath);
        return {
            crc: crypto.createHash('crc32').update(buffer).digest('hex'),
            md5: crypto.createHash('md5').update(buffer).digest('hex'),
            sha1: crypto.createHash('sha1').update(buffer).digest('hex')
        };
    }

    /**
     * Parses filename to guess game name and system.
     * @param {string} fileName - Name of the ROM file.
     * @returns {{gameName: string, system: string, region: string}}
     * @private
     */
    #parseFileName(fileName) {
        const name = path.basename(fileName, path.extname(fileName));
        const match = name.match(/^(.*?)\s*(?:\((.*?)\))?\s*(?:\[(.*?)\])?$/);
        return {
            gameName: (match?.[1] || name).trim(),
            region: match?.[2] || 'Unknown',
            system: match?.[3] || 'Unknown'
        };
    }

    /**
     * Adds ROMs from a folder to the collection, identifying and enriching with metadata.
     * @param {string} folderPath - Path to the folder containing ROMs.
     * @returns {Promise<void>}
     */
    async addRomsFromFolder(folderPath) {
        const files = await fs.readdir(folderPath);
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile() && /\.(zip|rom|nes|sfc|gb|gba|md)$/i.test(file)) {
                await this.addRom(filePath);
            }
        }
    }

    /**
     * Adds a single ROM to the collection.
     * @param {string} filePath - Path to the ROM file.
     * @returns {Promise<void>}
     */
    async addRom(filePath) {
        const hashes = await this.#computeRomHashes(filePath);
        const { gameName, system, region } = this.#parseFileName(path.basename(filePath));
        
        // Try identifying ROM by hashes
        let gameData;
        try {
            gameData = await this.#api.getRomInfoList(hashes.crc, hashes.md5, hashes.sha1);
        } catch (error) {
            console.warn(`ROM hash lookup failed for ${filePath}: ${error.message}`);
        }

        // Fallback to name-based search if hash lookup fails
        if (!gameData || !gameData.jeu) {
            try {
                const searchResults = await this.#api.searchGameByName(gameName);
                gameData = searchResults.jeux?.[0]; // Take top result
            } catch (error) {
                console.warn(`Search failed for ${gameName}: ${error.message}`);
                return; // Skip if both attempts fail
            }
        }

        // Process game data into structured object
        const game = {
            id: gameData?.jeu?.id || `custom_${Date.now()}`,
            title: gameData?.jeu?.noms?.[0]?.text || gameName,
            systemId: gameData?.jeu?.systemeid || 'unknown',
            genre: gameData?.jeu?.genres?.[0]?.noms?.[0]?.text || 'Unknown',
            region: gameData?.jeu?.regions?.[0]?.text || region,
            releaseDate: gameData?.jeu?.dates?.[0]?.text || 'Unknown',
            playerCount: gameData?.jeu?.joueurs?.text || 'Unknown',
            rating: gameData?.jeu?.note?.moyenne || 0,
            romDetails: hashes,
            media: {},
            filePath
        };

        // Fetch and store box art if available
        try {
            const mediaUrl = await this.#api.downloadGameMedia(game.id, 'box-2D');
            game.media.boxArt = mediaUrl;
        } catch (error) {
            console.warn(`Failed to fetch box art for ${game.title}: ${error.message}`);
        }

        // Add to collection if not already present
        if (!this.#collection.games.some(g => g.filePath === filePath)) {
            this.#collection.games.push(game);
            await this.#saveCollection();
        }
    }

    /**
     * Retrieves all games in the collection.
     * @returns {{ games: Array, lastUpdated: string }}
     */
    getCollection() {
        return this.#collection;
    }

    /**
     * Filters games by a query (e.g., title or genre).
     * @param {string} query - Search query.
     * @returns {Array} Filtered games.
     */
    searchCollection(query) {
        query = query.toLowerCase();
        return this.#collection.games.filter(game =>
            game.title.toLowerCase().includes(query) ||
            game.genre.toLowerCase().includes(query)
        );
    }

    /**
     * Updates a game's rating and submits it to ScreenScraper.
     * @param {string} gameId - Game ID.
     * @param {number} rating - Rating (0-100).
     * @returns {Promise<void>}
     */
    async updateGameRating(gameId, rating) {
        const game = this.#collection.games.find(g => g.id === gameId);
        if (!game) throw new Error(`Game with ID ${gameId} not found.`);
        if (rating < 0 || rating > 100) throw new Error("Rating must be between 0 and 100.");

        await this.#api.sendBotGameNote(gameId, rating, game.romDetails.crc);
        game.rating = rating;
        await this.#saveCollection();
    }
}

module.exports = RomManager;