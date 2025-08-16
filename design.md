# Retro Game Launcher - Design Documentation

## 1. Overview and Goals

The Retro Game Launcher is a desktop application built with Electron that allows users to manage and launch retro games. The application provides a comprehensive solution for organizing game collections, configuring emulators, and enriching game metadata using external data sources.

### Core Goals:
- Provide an intuitive interface for browsing and launching retro games
- Enable users to organize their game library with tags and metadata
- Automate ROM discovery and metadata enrichment through AI and online databases
- Support multiple platforms and emulators with flexible configuration
- Maintain all data locally in JSON format for portability

### Key Features:
- Game Library Management: Add, edit, and organize retro games
- Platform Support: Configure and manage different gaming platforms
- Emulator Integration: Set up emulators and launch games
- ROM Scanning: Automatically scan folders for ROM files and filter out non-ROM files
- Metadata Enrichment: Use AI (Google Gemini) and ScreenScraper.fr to enrich ROM metadata
- Tagging System: Organize games, platforms, and emulators with custom tags
- Data Persistence: All data is saved locally in JSON format

## 2. Tech Stack

The Retro Game Launcher is built using the following technologies:

### Core Technologies:
- **Electron**: Desktop application framework that combines Chromium and Node.js
- **HTML/CSS/JavaScript**: Frontend implementation using standard web technologies
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TW Elements**: UI components built on Tailwind CSS

### Key Libraries and Dependencies:
- **@google/generative-ai**: Google's AI SDK for accessing Gemini models
- **dotenv**: Environment variable management
- **mime**: MIME type detection for files
- **Electron IPC**: Inter-process communication between main and renderer processes

### External Services:
- **ScreenScraper.fr**: Primary source for game metadata and media
- **Google Gemini**: AI-powered ROM filename interpretation and platform descriptions
- **TheGamesDB** (planned): Additional metadata source
- **RAWG** (planned): Additional metadata source

### Development Tools:
- **Playwright**: End-to-end testing framework
- **Vitest**: Unit testing framework
- **JSDOM**: DOM implementation for testing

## 3. Data Structures and Sources

### Core Data Structures:

#### Game
```javascript
{
  id: string,           // Unique identifier
  title: string,        // Game title
  platformId: string,   // Reference to platform
  romPath: string,      // Path to ROM file
  cover_image_path: string, // URL to cover art
  description: string,  // Game description
  genre: string,        // Game genre
  releaseDate: string,  // Release date
  tags: string[]        // Array of tag IDs
}
```

#### Platform
```javascript
{
  id: string,           // Unique identifier
  platform_id: number,  // ScreenScraper platform ID
  name: string,         // Platform name
  manufacturer: string, // Manufacturer name
  release_year: string, // Release year
  description: string,  // Platform description
  tags: string[],       // Array of tag IDs
  cover_image_path: string // URL to platform image
}
```

#### Emulator
```javascript
{
  emulator_id: string,  // Unique identifier
  name: string,         // Emulator name
  executablePath: string, // Path to executable
  args: string,         // Command line arguments
  description: string,  // Description
  website: string,      // Website URL
  tags: string[]        // Array of tag IDs
}
```

#### Tag
```javascript
{
  id: string,           // Unique identifier
  name: string          // Tag name
}
```

### Data Storage:
All application data is stored in a single JSON file (`metadata.json`) with the following structure:
```javascript
{
  games: Game[],
  platforms: Platform[],
  emulators: Emulator[],
  tags: Tag[]
}
```

### Data Sources:

#### ScreenScraper.fr
The primary source for game and platform metadata. The application uses a custom ScreenScraperAPI class to interact with various endpoints:
- Platform information and media
- Game search and metadata
- Media assets (box art, screenshots, etc.)

#### Google Gemini
Used for AI-powered ROM filename interpretation and platform descriptions:
- Converting ROM filenames to game titles
- Generating platform descriptions when ScreenScraper data is insufficient

#### TheGamesDB (Planned)
Additional metadata source for games and platforms.

#### RAWG (Planned)
Additional metadata source for games and platforms.

## 4. Notable Design Decisions

### Architecture
1. **Electron Main/Renderer Separation**: 
   - Main process handles file system operations, API calls, and inter-process communication
   - Renderer process manages UI and user interactions
   - Communication between processes is handled through IPC channels

2. **Single Page Application with View Switching**:
   - All views (Games, Platforms, Emulators, etc.) are contained in a single HTML file
   - Views are shown/hidden using CSS classes rather than separate pages
   - Navigation is handled through JavaScript event listeners

3. **Modal-Based Forms**:
   - All data entry and editing is handled through modals
   - A generic modal system is used across the application to reduce code duplication
   - Form handling is centralized in the showModal function

### Data Management
1. **Local JSON Storage**:
   - All data is stored in a single JSON file for simplicity and portability
   - Data is loaded at application startup and saved on each modification
   - No external database is required

2. **Data Caching**:
   - Platform data from ScreenScraper is cached locally for one week
   - Cache is stored in Electron's user data directory

3. **Data Validation**:
   - Client-side validation is implemented for all forms
   - Duplicate prevention for games, platforms, and emulators
   - Required field validation before saving

### ROM Scanning and Metadata Enrichment Pipeline
1. **Three-Stage Process**:
   - ROM Discovery: Folder scanning with file extension filtering
   - Title Suggestion: AI-powered conversion of filenames to game titles
   - Metadata Enrichment: Fetching detailed metadata from ScreenScraper

2. **Batch Processing**:
   - ROMs are processed in batches to avoid API rate limits
   - Progress indicators provide user feedback during processing

3. **Error Handling**:
   - Graceful handling of missing or incomplete metadata
   - Clear status indicators for each ROM in the pipeline

### UI/UX Design
1. **Responsive Grid Layout**:
   - Games are displayed in a responsive grid that adapts to screen size
   - Platform and emulator information is displayed in consistent card layouts

2. **Tag-Based Organization**:
   - All entities (games, platforms, emulators) can be tagged
   - Tags are displayed as colored badges for visual organization

3. **Keyboard Shortcuts**:
   - ESC key closes modals
   - Ctrl/Cmd + S saves settings

### Security Considerations
1. **API Key Management**:
   - API keys are stored in a .env file and loaded at runtime
   - Keys are not exposed to the renderer process directly
   - Users can update keys through the settings interface

2. **File System Access**:
   - File system operations are restricted to the main process
   - ROM and emulator paths are validated before launching games
   - Directory scanning is initiated through Electron's dialog system

### Extensibility
1. **Modular API Classes**:
   - ScreenScraperAPI is implemented as a separate class for easy maintenance
   - GameService provides a higher-level abstraction for game-related operations

2. **Pluggable Data Sources**:
   - The query-data-sources IPC handler supports multiple data sources
   - Additional sources can be added by implementing new query functions

3. **Component-Based UI**:
   - Consistent rendering functions for each entity type
   - Reusable modal system for data entry