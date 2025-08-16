/**
 * @fileoverview JavaScript functions for interacting with the ScreenScraper API.
 * This module provides a ScreenScraperAPI class to make requests to various
 * ScreenScraper endpoints, abstracting away the URL construction and fetch logic.
 */

module.exports = class ScreenScraperAPI {
    #BASE_URL = 'https://screenscraper.fr/api2';
    #user;
    #password;

    constructor(user, password) {
        if (!user || !password) {
            console.error("ScreenScraperAPI: Username and password are required.");
            throw new Error("ScreenScraperAPI: Username and password are required.");
        }
        this.#user = user;
        this.#password = password;
    }

    async #fetchData(endpoint, params = {}) {
        const urlParams = new URLSearchParams({
            devid: this.#user,
            devpassword: this.#password,
            output: 'json',
            ...params
        });

        const fullUrl = `${this.#BASE_URL}/${endpoint}?${urlParams.toString()}`;

        try {
            console.log(`Fetching from: ${fullUrl}`);
            const response = await fetch(fullUrl);

            // Check if response is text and contains authentication error
            const responseText = await response.text();
            
            // Check for authentication error in response text
            if (responseText.includes("Erreur de login")) {
                throw new Error("Authentication failed: Invalid ScreenScraper credentials");
            }

            // If we've reached here and response is not OK, handle other errors
            if (!response.ok) {
                let errorMessage = `HTTP error! Status: ${response.status}`;
                try {
                    const errorJson = JSON.parse(responseText);
                    errorMessage += ` - ${errorJson.status || errorJson.error || response.statusText}`;
                } catch (e) {
                    errorMessage += ` - ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            // Try to parse response as JSON
            try {
                const jsonResponse = JSON.parse(responseText);
                return jsonResponse;
            } catch (e) {
                // If parsing fails, check if it's an authentication error
                if (responseText.includes("Erreur de login")) {
                    throw new Error("Authentication failed: Invalid ScreenScraper credentials");
                }
                // Otherwise return as text
                return responseText;
            }
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            throw error;
        }
    }

    async getInfrastructureInfo() {
        return this.#fetchData('ssinfraInfos.php');
    }

    async getUserInfo() {
        return this.#fetchData('ssuserInfos.php');
    }

    async getUserLevelsList() {
        return this.#fetchData('userlevelsListe.php');
    }

    async getPlayerCountsList() {
        return this.#fetchData('nbJoueursListe.php');
    }

    async getSupportTypesList() {
        return this.#fetchData('supportTypesListe.php');
    }

    async getRomTypesList() {
        return this.#fetchData('romTypesListe.php');
    }

    async getGenresList() {
        return this.#fetchData('genresListe.php');
    }

    async getRegionsList() {
        return this.#fetchData('regionsListe.php');
    }

    async getLanguagesList() {
        return this.#fetchData('languesListe.php');
    }

    async getClassificationList() {
        return this.#fetchData('classificationListe.php');
    }

    async getSystemMediaList(systemId) {
        const params = systemId ? { systemid: systemId } : {};
        return this.#fetchData('mediasSystemeListe.php', params);
    }

    async getGameMediaList(gameId) {
        const params = gameId ? { idjeu: gameId } : {};
        return this.#fetchData('mediasJeuListe.php', params);
    }

    async getGameInfoList(gameId) {
        const params = gameId ? { idjeu: gameId } : {};
        return this.#fetchData('infosJeuListe.php', params);
    }

    async getRomInfoList(romCrc, romMd5, romSha1) {
        const params = {};
        if (romCrc) params.crc = romCrc;
        if (romMd5) params.md5 = romMd5;
        if (romSha1) params.sha1 = romSha1;
        return this.#fetchData('infosRomListe.php', params);
    }

    async downloadGroupMedia(groupId, mediaType) {
        return this.#fetchData('mediaGroup.php', { idgroupe: groupId, type: mediaType });
    }

    async downloadCompanyMedia(companyId, mediaType) {
        return this.#fetchData('mediaCompagnie.php', { idcompagnie: companyId, type: mediaType });
    }

    async getSystemsList(systemId) {
        const params = systemId ? { systemid: systemId } : {};
        return this.#fetchData('systemesListe.php', params);
    }

    async downloadSystemMedia(systemId, mediaType) {
        return this.#fetchData('mediaSysteme.php', { systemid: systemId, type: mediaType });
    }

    async downloadSystemVideoMedia(systemId, mediaType) {
        return this.#fetchData('mediaVideoSysteme.php', { systemid: systemId, type: mediaType });
    }

    async searchGameByName(gameName, systemId) {
        if (!gameName) {
            throw new Error("Game name is required for searchGameByName.");
        }
        const params = { recherche: gameName };
        if (systemId) params.systemeid = systemId;
        return this.#fetchData('jeuRecherche.php', params);
    }

    async getGameInfo(gameId) {
        if (!gameId) {
            throw new Error("Game ID is required for getGameInfo.");
        }
        return this.#fetchData('jeuInfos.php', { gameid: gameId });
    }

    async downloadGameMedia(gameId, mediaType, systemId, romCrc, romMd5, romSha1) {
        if (!gameId || !mediaType) {
            throw new Error("Game ID and media type are required for downloadGameMedia.");
        }
        const params = { idjeu: gameId, type: mediaType };
        if (systemId) params.systemid = systemId;
        if (romCrc) params.crc = romCrc;
        if (romMd5) params.md5 = romMd5;
        if (romSha1) params.sha1 = romSha1;
        return this.#fetchData('mediaJeu.php', params);
    }

    async downloadGameVideoMedia(gameId, mediaType, systemId, romCrc, romMd5, romSha1) {
        if (!gameId || !mediaType) {
            throw new Error("Game ID and media type are required for downloadGameVideoMedia.");
        }
        const params = { idjeu: gameId, type: mediaType };
        if (systemId) params.systemid = systemId;
        if (romCrc) params.crc = romCrc;
        if (romMd5) params.md5 = romMd5;
        if (romSha1) params.sha1 = romSha1;
        return this.#fetchData('mediaVideoJeu.php', params);
    }

    async downloadGameManual(gameId, systemId) {
        if (!gameId) {
            throw new Error("Game ID is required for downloadGameManual.");
        }
        const params = { idjeu: gameId };
        if (systemId) params.systemid = systemId;
        return this.#fetchData('mediaManuelJeu.php', params);
    }

    async sendBotGameNote(gameId, rating, romCrc) {
        if (!gameId || rating === undefined) {
            throw new Error("Game ID and rating are required for sendBotGameNote.");
        }
        if (rating < 0 || rating > 100) {
            throw new Error("Rating must be between 0 and 100.");
        }
        const params = { idjeu: gameId, note: rating };
        if (romCrc) params.crc = romCrc;
        return this.#fetchData('botNote.php', params);
    }

    async sendBotProposal(proposalData) {
        if (!proposalData) {
            throw new Error("Proposal data is required for sendBotProposal.");
        }
        return this.#fetchData('botProposition.php', proposalData);
    }
}