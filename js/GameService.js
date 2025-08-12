// gameService.js
const ScreenScraperAPI = require('./screenscraperAPI'); 

module.exports=class GameService {
    #ssApi;

    constructor(user, password) {
        console.log(`Initializing GameService with user: ${user}`);
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
                console.log(`No games found for "${gameName}".`);
                return null;
            }

            // ScreenScraper often returns an array even for one result
            const gameData = Array.isArray(searchResults.response.jeux) ? searchResults.response.jeux[0] : searchResults.response.jeux;

            if (!gameData || !gameData.id) {
                console.log(`Could not extract game ID for "${gameName}".`);
                return null;
            }

            const gameId = gameData.id;

            // Fetch full game info (includes media details)
            const fullGameInfo = await this.#ssApi.getGameInfo(gameId);

            if (!fullGameInfo || !fullGameInfo.response || !fullGameInfo.response.jeux) {
                console.log(`Could not fetch full info for game ID ${gameId}.`);
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
                    if (m.type === 'box2d' && m.url) media.boxArt = m.url;
                    if (m.type === 'screenshot' && m.url) media.screenshot = m.url;
                    if (m.type === 'fanart' && m.url) media.fanArt = m.url;
                    if (m.type === 'video' && m.url) media.video = m.url;
                    // Add more media types as needed
                });
            }

            return {
                id: gameDetails.id,
                names: gameDetails.noms, // Array of names in different languages
                regions: gameDetails.regions, // Array of regions
                dates: gameDetails.dates, // Array of release dates
                developers: gameDetails.developpeur,
                publishers: gameDetails.editeur,
                genres: gameDetails.genres,
                players: gameDetails.players,
                rating: gameDetails.note,
                description: gameDetails.synopsis,
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
