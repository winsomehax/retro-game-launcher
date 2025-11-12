// gameService.js
const ScreenScraperAPI = require('./screenscraperAPI'); 

module.exports=class GameService {
    #ssApi;

    constructor(user, password) {
        console.log(`Initializing GameService with user: ${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(user) : String(user).replace(/[\x00-\x1F\x7F]/g, '')}`);
        this.#ssApi = new ScreenScraperAPI(user, password);
    }

    // Expose the ScreenScraperAPI instance
    get ssAPI() {
        return this.#ssApi;
    }

    /**
     * Searches for a game by name and fetches its primary info and default media.
     * Returns the first match with basic details and media URLs.
     * @param {string} gameName - The name of the game to search for.
     * @param {number} [systemId] - Optional. Filter search by system ID.
     * @returns {Promise<Object|null>} A promise that resolves with game details and media URLs, or null if not found.
     */
    async getGameOverview(gameName, systemId) {
        try {
            const searchResults = await this.#ssApi.searchGameByName(gameName, systemId);

            if (!searchResults || !searchResults.response || !searchResults.response.jeux) {
                console.log(`No games found for "${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(gameName) : String(gameName).replace(/[\x00-\x1F\x7F]/g, '')}".`);
                return null;
            }

            // ScreenScraper often returns an array even for one result
            const gameData = Array.isArray(searchResults.response.jeux) ? searchResults.response.jeux[0] : searchResults.response.jeux;

            if (!gameData || !gameData.id) {
                console.log(`Could not extract game ID for "${typeof window !== 'undefined' && window.Sanitizer ? window.Sanitizer.sanitizeForLog(gameName) : String(gameName).replace(/[\x00-\x1F\x7F]/g, '')}".`);
                return null;
            }

            const gameId = gameData.id;

            // Fetch full game info (includes media details)
            const fullGameInfo = await this.#ssApi.getGameInfo(gameId);

            if (!fullGameInfo || !fullGameInfo.response || !fullGameInfo.response.jeux) {
                const sanitizedGameId = window.Sanitizer ? window.Sanitizer.sanitizeForLog(gameId) : gameId;
                console.log(`Could not fetch full info for game ID ${sanitizedGameId}.`);
                return {
                    id: gameId,
                    name: gameData.nom,
                    // Minimal details if full info fetch fails
                };
            }

            const gameDetails = fullGameInfo.response.jeux[0]; // Assuming it's an array for jeuInfos.php too

            // Extract default media URLs (e.g., box2d, screenshot)
            const media = {};
            if (gameDetails.medias && Array.isArray(gameDetails.medias)) {
                gameDetails.medias.forEach(m => {
                    // Prioritize specific types or pick the first available for a type
                    if (m.type === 'box-2D' && m.url) media.boxArt = m.url;
                    if (m.type === 'ss' && m.url) media.screenshot = m.url;
                    if (m.type === 'fanart' && m.url) media.fanArt = m.url;
                    if (m.type === 'video' && m.url) media.video = m.url;
                    // Add more media types as needed
                });
            }

            // Extract names with preference for English
            let title = 'Unknown Title';
            if (gameDetails.noms && Array.isArray(gameDetails.noms)) {
                const enName = gameDetails.noms.find(n => n.region === 'eu' || n.region === 'us');
                title = enName ? enName.text : gameDetails.noms[0].text;
            }

            // Extract description with preference for English
            let description = '';
            if (gameDetails.synopsis && Array.isArray(gameDetails.synopsis)) {
                const enSynopsis = gameDetails.synopsis.find(s => s.langue === 'en');
                description = enSynopsis ? enSynopsis.text : gameDetails.synopsis[0].text;
            }

            // Extract genres
            let genre = '';
            if (gameDetails.genres && Array.isArray(gameDetails.genres) && gameDetails.genres.length > 0) {
                const primaryGenre = gameDetails.genres[0];
                if (primaryGenre.noms && Array.isArray(primaryGenre.noms)) {
                    const enGenre = primaryGenre.noms.find(n => n.langue === 'en');
                    genre = enGenre ? enGenre.text : primaryGenre.noms[0].text;
                }
            }

            // Extract release date
            let releaseDate = '';
            if (gameDetails.dates && Array.isArray(gameDetails.dates) && gameDetails.dates.length > 0) {
                releaseDate = gameDetails.dates[0].text;
            }

            // Extract developer
            let developer = '';
            if (gameDetails.developpeur && gameDetails.developpeur.text) {
                developer = gameDetails.developpeur.text;
            }

            // Extract publisher
            let publisher = '';
            if (gameDetails.editeur && gameDetails.editeur.text) {
                publisher = gameDetails.editeur.text;
            }

            // Extract players
            let players = '';
            if (gameDetails.joueurs && gameDetails.joueurs.text) {
                players = gameDetails.joueurs.text;
            }

            return {
                id: gameDetails.id,
                title: title,
                names: gameDetails.noms, // Array of names in different languages
                regions: gameDetails.regions, // Array of regions
                dates: gameDetails.dates, // Array of release dates
                developers: developer,
                publishers: publisher,
                genres: genre,
                players: players,
                rating: gameDetails.note,
                description: description,
                system: gameDetails.systeme,
                media: media // Contains URLs to download media
            };

        } catch (error) {
            console.error(`Error in getGameOverview for "${gameName}":`, error);
            throw error; // Re-throw to allow higher-level error handling
        }
    }

    /**
     * Downloads a specific game media and returns its direct content (URL or binary data).
     * You'd typically use this after getting the media URLs from getGameOverview or getGameInfo.
     * @param {number} gameId - The ID of the game.
     * @param {string} mediaType - The type of media to download (e.g., 'box2d', 'screenshot', 'fanart').
     * @returns {Promise<string>} A promise that resolves with the URL or binary data of the media.
     */
    async downloadGameAsset(gameId, mediaType) {
        return this.#ssApi.downloadGameMedia(gameId, mediaType);
    }

    // Add more high-level methods here...
}
