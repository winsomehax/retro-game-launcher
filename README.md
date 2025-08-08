# Retro Game Launcher

A desktop application for managing and launching retro games, built with Electron, HTML, CSS, and JavaScript.

## Features

- **Game Library Management**: Add, edit, and organize your retro game collection
- **Platform Support**: Configure and manage different gaming platforms
- **Emulator Integration**: Set up emulators for different platforms and launch games
- **ROM Scanning**: Automatically scan folders for ROM files and filter out non-ROM files
- **Metadata Enrichment**: Use AI (Google Gemini) and ScreenScraper.fr to enrich ROM metadata
- **Tagging System**: Organize games, platforms, and emulators with custom tags
- **Data Persistence**: All data is saved locally in JSON format

## Prerequisites

- Node.js (v14 or later recommended)
- npm (usually comes with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd retro-game-launcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with your API keys:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   SCREENSCRAPER_DEVID=your_screenscraper_dev_id
   SCREENSCRAPER_DEV_PASSWORD=your_screenscraper_dev_password
   ```

## Running the Application

Start the application with:
```bash
npm start
```

## Usage

### Setting Up Platforms

1. Navigate to the "Platforms" view
2. Click "Add Platform"
3. Select a platform from the ScreenScraper database
4. Optionally add manufacturer, release year, and description
5. Save the platform

### Configuring Emulators

1. Navigate to the "Emulators" view
2. Click "Add Emulator"
3. Enter the emulator name, executable path, and command-line arguments
4. Save the emulator configuration

### Adding Games Manually

1. Navigate to the "Games" view
2. Click "Add Game"
3. Enter game details including title, platform, and ROM path
4. Save the game

### Scanning and Importing ROMs

1. Navigate to the "Scan ROMs" view
2. Select a platform from the dropdown
3. Click "Select Folder to Scan" and choose a folder containing ROMs
4. The application will automatically filter out non-ROM files
5. Select ROMs to process
6. Click "Get Suggestions" to use AI to identify game titles
7. Click "Enrich Selected" to fetch metadata from ScreenScraper
8. Click "Import Selected" to add games to your library

### Launching Games

1. Navigate to the "Games" view
2. Find the game you want to launch
3. Click the "Launch" button
4. The game will launch using the configured emulator

## API Keys

The application uses external services for metadata enrichment:

- **Google Gemini**: For AI-powered ROM filename interpretation
- **ScreenScraper.fr**: For comprehensive game metadata

You'll need to obtain API keys from these services and add them to your `.env` file.

## Project Structure

```
retro-game-launcher/
├── js/                 # JavaScript modules
│   ├── app.js          # Main frontend application
│   ├── GameService.js  # Game metadata service
│   └── screenscraperAPI.js # ScreenScraper API wrapper
├── tests/              # Playwright tests
├── index.html          # Main HTML file
├── main.js             # Electron main process
├── preload.js          # Electron preload script
├── package.json        # Project dependencies and scripts
└── README.md           # This file
```

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.