| English API | Actual Endpoint (French) | English Description | Parameters (with Type) |
|----------|----------------------|---------------------|-----------------------|
| `getInfrastructureInfo()` | ssinfraInfos.php | Fetches information about the ScreenScraper infrastructure. | None |
| `getUserInfo()` | ssuserInfos.php | Fetches information about the current ScreenScraper user. | None |
| `getUserLevelsList()` | userlevelsListe.php | Fetches a list of ScreenScraper user levels. | None |
| `getPlayerCountsList()` | nbJoueursListe.php | Fetches a list of player counts for games. | None |
| `getSupportTypesList()` | supportTypesListe.php | Fetches a list of media support types (e.g., cartridge, disc). | None |
| `getRomTypesList()` | romTypesListe.php | Fetches a list of ROM types. | None |
| `getGenresList()` | genresListe.php | Fetches a list of game genres. | None |
| `getRegionsList()` | regionsListe.php | Fetches a list of regions for games. | None |
| `getLanguagesList()` | languesListe.php | Fetches a list of languages for game metadata. | None |
| `getClassificationList()` | classificationListe.php | Fetches a list of game classifications (ratings). | None |
| `getSystemMediaList(systemId)` | mediasSystemeListe.php | Fetches a list of available media for systems. | `systemId: number` (optional) - Filter by a specific system ID. |
| `getGameMediaList(gameId)` | mediasJeuListe.php | Fetches a list of available media for games. | `gameId: number` (optional) - Filter by a specific game ID. |
| `getGameInfoList(gameId)` | infosJeuListe.php | Fetches information for games. | `gameId: number` (optional) - Filter by a specific game ID. |
| `getRomInfoList(romCrc, romMd5, romSha1)` | infosRomListe.php | Fetches information for ROMs based on hashes. | `romCrc: string` (optional) - CRC32 hash of the ROM.<br>`romMd5: string` (optional) - MD5 hash of the ROM.<br>`romSha1: string` (optional) - SHA1 hash of the ROM. |
| `downloadGroupMedia(groupId, mediaType)` | mediaGroup.php | Downloads image media for game groups. | `groupId: number` - The ID of the game group.<br>`mediaType: string` - The type of media (e.g., 'box2d', 'fanart'). |
| `downloadCompanyMedia(companyId, mediaType)` | mediaCompagnie.php | Downloads image media for company groups. | `companyId: number` - The ID of the company.<br>`mediaType: string` - The type of media (e.g., 'logo', 'banner'). |
| `getSystemsList(systemId)` | systemesListe.php | Fetches a list of systems, system information, and system media information. | `systemId: number` (optional) - Filter by a specific system ID. |
| `downloadSystemMedia(systemId, mediaType)` | mediaSysteme.php | Downloads image media for a specific system. | `systemId: number` - The ID of the system.<br>`mediaType: string` - The type of media (e.g., 'logo', 'banner'). |
| `downloadSystemVideoMedia(systemId, mediaType)` | mediaVideoSysteme.php | Downloads video media for a specific system. | `systemId: number` - The ID of the system.<br>`mediaType: string` - The type of video media (e.g., 'intro', 'gameplay'). |
| `searchGameByName(gameName, systemId)` | jeuRecherche.php | Searches for a game by its name, returning up to 30 games ranked by probability. | `gameName: string` - The name of the game to search for.<br>`systemId: number` (optional) - Filter search by system ID. |
| `getGameInfo(gameId)` | jeuInfos.php | Fetches information and media for a specific game. | `gameId: number` - The ID of the game. |
| `downloadGameMedia(gameId, mediaType, systemId, romCrc, romMd5, romSha1)` | mediaJeu.php | Downloads image media for a specific game. | `gameId: number` - The ID of the game.<br>`mediaType: string` - The type of media (e.g., 'box2d', 'screenshot', 'fanart').<br>`systemId: number` (optional) - The ID of the system.<br>`romCrc: string` (optional) - CRC32 of the ROM.<br>`romMd5: string` (optional) - MD5 of the ROM.<br>`romSha1: string` (optional) - SHA1 of the ROM. |
| `downloadGameVideoMedia(gameId, mediaType, systemId, romCrc, romMd5, romSha1)` | mediaVideoJeu.php | Downloads video media for a specific game. | `gameId: number` - The ID of the game.<br>`mediaType: string` - The type of video media (e.g., 'gameplay', 'intro').<br>`systemId: number` (optional) - The ID of the system.<br>`romCrc: string` (optional) - CRC32 of the ROM.<br>`romMd5: string` (optional) - MD5 of the ROM.<br>`romSha1: string` (optional) - SHA1 of the ROM. |
| `downloadGameManual(gameId, systemId)` | mediaManuelJeu.php | Downloads manuals for a specific game. | `gameId: number` - The ID of the game.<br>`systemId: number` (optional) - The ID of the system. |
| `sendBotGameNote(gameId, rating, romCrc)` | botNote.php | Sends an automated game rating from a ScreenScraper member. | `gameId: number` - The ID of the game to rate.<br>`rating: number` - The rating value (0-100).<br>`romCrc: string` (optional) - CRC32 of the ROM. |
| `sendBotProposal(proposalData)` | botProposition.php | Sends automated information or media proposals to ScreenScraper. | `proposalData: Object` - Object containing proposal details (e.g., { type: 'game_info', idjeu: 123, field: 'description', value: 'New description' }). |