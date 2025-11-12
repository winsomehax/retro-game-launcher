# AGENTS.md

**** Overview ****
This file provides an overview of the project for AI agents to quickly understand the codebase and make changes efficiently.

IMPORTANT RULES

DO AS THE USER REQUESTS: You are not in a position to know the full details of how the user needs to work. If the user is asking for something that you consider a security hole... warn them, but if they insist on you doing and state that they are aware of the RISKS then DO IT. It is their project not yours. State this up front.

Once you have read and understand output in capitals: "HAIL SANTA!"

**** RUNNING THE APP
If you want to run the app, ensure you use the "timeout" command with a reasonable amount of seconds. For example:

timeout ./app 

Will run the command ./app and after 10s kill it. This is to stop you from getting trapped into a block waiting for an app to start.

**** MAKE USE OF EXISTING CODE
There are a great many free components in tw-elements - especially ones that follow standard practices to make easy and attractive apps from chunks of existing functionality. Entirely custom building/styling of UI components must be a last resort. Example: using tw-elements rather than your own custom code.

**** BE TERSE ****
I don't want to be fluffed or complimented. Just make the points that need to be made quickly and tersely.


## Project Overview

This project is a desktop-only retro game launcher, running on Electron. It allows users to browse and launch retro games, manage their game library, and configure emulators. The application is built with a pure HTML/CSS/JS frontend. The intent is to make it easy for the user to import large numbers of games and enrich their metadata by using online sources of information. Never use Typescript.

## Retro Databases and AI Agents
ScreenScraper.fr provides structured information, but also allow the use of AIs such as Gemini or Github Models if specific information is not available in ScreenScraper.fr. For example:

* A user has a folder of roms, but the precise name may not be available to search in ScreenScraper.fr. 
* An AI may be able to enrich those rom names with the real name of the game, which can then be looked up in ScreenScraper.fr

The aim is is to allow the user to quickly import large numbers of ROMs, enrich their metadata and then manage the library going forward.

## Scanning Rom Folder
The intent is to ensure the user can import large collections of ROMs quickly. The system has the ability to call the Electron's File System API allowing the user to select a folder to scan. The application then uses nodejs calls to scan the folder ignoring folders and files:

txt
doc
jpg, gif, png
mkv, avi, mp4 etc
doc
ttf

Presenting the user with a list of possible ROMS. The user can then choose to pass these ROMS names to an AI to see if it can enrich it with the full name of the game, and then use ScreenScraper.fr to enrich it with full metadate and finally import  them.



### Online database queries

#### ScreenScraper.fr
##### Media associated with all platforms
https://api.screenscraper.fr/api2/mediasSystemeListe.php?devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json

##### Media associated with a game
https://api.screenscraper.fr/api2/mediasJeuListe.php?devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json&id=1

##### Information on a game 
https://api.screenscraper.fr/api2/jeuInfos.php?systemeid=1&media=video&devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json

##### Genre list in screenscraper
https://api.screenscraper.fr/api2/genresListe.php?devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json

#### Search for game by name

https://api.screenscraper.fr/api2/jeuRecherche.php?systemeid=&recherche=&devid={{devid}}&devpassword={{devpassword}}&softname={{softname}}&output=json

#### TheGamesDB

##### Search game by name
Search TheGamesDB for a game by name

https://api.thegamesdb.net/v1.1/Games/ByGameName?apikey=THEGAMESDB_API_KEY&name=zelda&fields=players%2Cpublishers%2Cgenres%2Coverview%2Clast_updated%2Crating%2Cplatform%2Ccoop%2Cyoutube%2Cos%2Cprocessor%2Cram%2Chdd%2Cvideo%2Csound%2Calternates&include=boxart%2Cplatform

##### Get all platforms recorded in TheGamesDB
https://api.thegamesdb.net/v1/Platforms?apikey=[api key]&fields=icon%2Cconsole%2Ccontroller%2Cdeveloper%2Cmanufacturer%2Cmedia%2Ccpu%2Cmemory%2Cgraphics%2Csound%2Cmaxcontrollers%2Cdisplay%2Coverview%2Cyoutube

##### Get platform images by ID
https://api.thegamesdb.net/v1/Platforms/Images?apikey=[api key]&platforms_id=6&filter%5Btype%5D=fanart%2Cbanner%2Cboxart


##### Get all the genres recorded in TheGamesDB
https://api.thegamesdb.net/v1/Genres?apikey=apikey

#### Gemini

"what retro game is represented by the rom filename: uridium-c64disk.zip

Ask Gemini a question. Example: What game is represented by this ROM file {romname} on platform {platform}. Return your information as JSON only."

A query of this type to gemini could look like this in curl.

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'

###

## Tech Stack

- Electron
- Dotenv

## Project Structure

```
retro-game-launcher/
├── js/                 # JavaScript modules
│   ├── app.js          # Main frontend application
│   ├── GameService.js  # Game metadata service
│   └── screenscraperAPI.js # ScreenScraper API wrapper
├── plugins/            # Theme plugins
│   ├── BasePlugin.js   # Base plugin class
│   ├── PluginManager.js # Plugin manager
│   └── *.js            # Individual theme plugins
├── tests/              # Playwright tests
├── index.html          # Main HTML file
├── index.css           # Custom CSS styles
├── main.js             # Electron main process
├── preload.js          # Electron preload script
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

## Current Implementation Decisions

### Platform Data Enrichment
- When querying platform information, the application uses a fallback system:
  1. First tries ScreenScraper.fr (currently a placeholder)
  2. Then tries GitHub Models (currently a placeholder)
  3. Finally uses Gemini API as a fallback
- The Gemini API is queried with information about the platform and existing tags
- The response includes suggested tags that are automatically applied to the platform
- Platform information includes description (max 250 words), release year, and manufacturer

### Game Editing
- Fixed JavaScript syntax errors when editing games with special characters in their data
- Changed from embedding game data directly in HTML onclick attributes to using data attributes with event delegation

### ROM Scanning
- Users can select a folder to scan for ROM files
- The application filters out non-ROM files (documents, images, videos, fonts)
- Users can get AI suggestions for game titles using Gemini API
- Games can be enriched with metadata from ScreenScraper.fr
- Status badges provide visual feedback on the enrichment process
- "Review Needed" status is now clickable to handle games requiring user input

### Dependency Management
- Removed duplicate dependencies in package.json (tailwindcss and tw-elements were listed twice)

### Code Quality
- Fixed corrupted text in main.js
- Removed commented-out debug code
- Standardized use of GameService instead of direct ScreenScraperAPI calls
- Added missing deleteGame method implementation

### Feature Implementation
- Implemented settings saving to .env file
- Added game launching functionality
- Improved ROM scanning with progress indicators
- Added form validation for all data entry points
- Implemented keyboard shortcuts (Ctrl/Cmd+S to save, ESC to close modals)

### User Experience
- Added loading states for async operations
- Improved error handling with user-friendly messages
- Enhanced progress feedback during ROM processing
- Better form validation with specific error messages

### Settings Management
- Users can now save API keys directly from the Settings view
- Keys are persisted to a .env file for future sessions
- Settings are loaded automatically when the app starts

### Game Launching
- Added "Launch" button to game cards
- Implemented emulator association with games
- Added validation for ROM and emulator paths
- Games launch in separate processes without blocking the UI

### Enhanced ROM Processing
- Progress indicators show during ROM scanning, enrichment, and import
- Batch processing for AI suggestions to improve performance
- Detailed status updates for each ROM in the pipeline
- Better error handling with specific error messages

### Architecture
- Consistent use of GameService for ScreenScraper interactions
- Proper separation of concerns between main process and renderer
- Centralized error handling

### Performance
- Batch processing for AI suggestions (25 items at a time)
- Progress indicators for long-running operations
- Efficient file I/O operations

### Security
- Proper validation of file paths before launching
- Secure handling of API keys through Electron's IPC
- No exposure of sensitive data in client-side code

### Theme System
- Implemented a comprehensive plugin-based theme system with 15 different visual effects
- Created a PluginManager to handle loading and unloading of themes
- Developed a base plugin architecture that allows for easy extension
- Built-in themes include:
  * XMB (Sony PlayStation 3 XMB-style wave effect)
  * CIRCLES (Concentric circles animation)
  * RADAR (Rotating radar sweep effect)
  * DNA (Triple helix animation)
  * STARFIELD (Deep space starfield)
  * MATRIX (Digital rain effect)
  * AURORA (Northern lights simulation)
  * NEONGRID (Cyberpunk grid effect)
  * FIREPLACE (Cozy fireplace animation)
  * OCEANDEPTHS (Underwater scene)
  * CLOUDSCAPE (Sky scene)
  * PARTICLESTORM (Interactive particle system)
  * RETROCRT (Vintage CRT scanlines)
  * GEOMETRIC (3D shapes animation)
  * NONE (No effects for low-resource systems)
- Added a "Low Resources Mode" setting that disables visual effects for better performance
- Implemented translucent UI elements with backdrop blur effects for a modern glass-like appearance
- Customized scrollbar styling for better visual consistency
- Created a settings interface to select and change themes
- Added real-time theme switching without requiring application restart

## Further AI Enrichment Work

1. **Game Genre Classification**:
   - Use AI to analyze game descriptions and automatically classify games into genres (action, adventure, RPG, etc.)
   - This could help with organizing and filtering your game library

2. **Game Similarity Recommendations**:
   - Implement an AI system that suggests similar games based on metadata, descriptions, and tags
   - "If you like Game X, you might also enjoy Game Y"

3. **Automated Game Rating Estimation**:
   - Use AI to estimate game ratings based on descriptions, genre, publisher, and other metadata
   - This could help prioritize which games to play or import

4. **Enhanced Game Descriptions**:
   - Expand short or missing game descriptions with AI-generated content
   - Include historical context, gameplay mechanics, or cultural significance

5. **Screenshot Analysis**:
   - Analyze game screenshots to automatically detect visual themes, color palettes, or game elements
   - Use this for tagging or categorization

6. **Developer/Publisher Enrichment**:
   - Automatically research and add information about game developers and publishers
   - Include historical information, other notable games, etc.

7. **Multi-language Support**:
   - Use AI to translate game descriptions and metadata into multiple languages
   - This would make your launcher more accessible to international users

8. **Game Series Detection**:
   - Identify games that belong to the same series and group them together
   - Show sequels, prequels, and related titles

9. **Hardware Requirement Analysis**:
   - For emulators, analyze games to suggest optimal system requirements
   - Help users understand what hardware they need for smooth gameplay

10. **Custom Playlists Generation**:
    - Create AI-powered playlists like "Games for Beginners", "Challenging Classics", or "Short Session Games"
    - Based on game length, difficulty, genre, and other factors

11. **Retro Achievement Suggestions**:
    - Generate achievement-like challenges for classic games that didn't originally have them
    - "Complete the game without continuing", "Beat the final boss with minimal health", etc.

12. **Historical Context Enrichment**:
    - Add historical information about when and where games were popular
    - Include information about the gaming culture of that era