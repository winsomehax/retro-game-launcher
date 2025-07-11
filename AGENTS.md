
# AGENTS.md

This file provides an overview of the project for AI agents to quickly understand the codebase and make changes efficiently.

## Project Overview

This project is a web-based retro game launcher. It allows users to browse and launch retro games, manage their game library, and configure emulators. The application is built with a React frontend and a Node.js/Express backend. The intent is to make it easy for the user to import large numbers of games and enrich their metadata by using online sources of information. 

## Retro Databases and AI Agents
TheGamesDB provides structured information, but also allow the use of AIs such as Gemini or Github Models if specific information is not available in TheGamesDB. For example:

* A user has a folder of roms, but the precise name may not be available to search in TheGamesDB. 
* An AI may be able to enrich those rom names with the real name of the game, which can then be looked up in TheGamesDB

The aim is is to allow the user to quickly import large numbers of ROMs, enrich their metadata and then manage the library going forward.

### Online database queries
#### TheGamesDB

##### Search game by name
Search TheGamesDB for a game by name

https://api.thegamesdb.net/v1.1/Games/ByGameName?apikey=THEGAMESDB_API_KEY&name=zelda&fields=players%2Cpublishers%2Cgenres%2Coverview%2Clast_updated%2Crating%2Cplatform%2Ccoop%2Cyoutube%2Cos%2Cprocessor%2Cram%2Chdd%2Cvideo%2Csound%2Calternates&include=boxart%2Cplatform

##### Get all platforms recorded in TheGamesDB
https://api.thegamesdb.net/v1/Platforms?apikey=ab7ee8591b660ef9fbfde5e9d51db8e0ff867901c17a49350ed8e9b03fadd30d&fields=icon%2Cconsole%2Ccontroller%2Cdeveloper%2Cmanufacturer%2Cmedia%2Ccpu%2Cmemory%2Cgraphics%2Csound%2Cmaxcontrollers%2Cdisplay%2Coverview%2Cyoutube

##### Get platform images by ID
https://api.thegamesdb.net/v1/Platforms/Images?apikey=ab7ee8591b660ef9fbfde5e9d51db8e0ff867901c17a49350ed8e9b03fadd30d&platforms_id=6&filter%5Btype%5D=fanart%2Cbanner%2Cboxart


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

- **Frontend:**
    - React
    - TypeScript
    - Vite
    - React Router
    - Axios (for API requests)
- **Backend:**
    - Node.js
    - Express.js
    - Cors
    - Dotenv
- **Development:**
    - npm-run-all (for running client and server concurrently)
    - nodemon (for automatic server restarts)
    - TypeScript
    - Supertest (for backend testing)

## Project Structure

- **`/`**: The root directory contains configuration files like `package.json`, `vite.config.js`, and `tsconfig.json`, as well as the main entry points for the application (`index.html`, `index.tsx`, `App.tsx`).
- **`/components`**: Contains reusable React components used throughout the application.
- **`/hooks`**: Contains custom React hooks.
- **`/pages`**: Contains the main view components for each page of the application.
- **`/server`**: Contains the Node.js/Express backend server code.
    - **`/server/ai-providers`**: Contains modules for interacting with different AI services.
    - **`/server/data`**: Likely contains data-related files for the backend.
- **`/dist`**: The output directory for the production build, generated by Vite.

## Available Scripts

The following scripts are defined in `package.json`:

- **`npm run dev:client`**: Starts the Vite development server for the React frontend.
- **`npm run dev:server`**: Starts the Node.js/Express backend server.
- **`npm run dev`**: Runs both the client and server development servers concurrently using `npm-run-all`.
- **`npm run build`**: Builds the React application for production using Vite.
- **`npm run preview`**: Serves the production build locally for previewing.

## Key Files

- **`package.json`**: Defines project dependencies, scripts, and metadata.
- **`vite.config.js`**: Configuration file for the Vite development server and build process.
- **`tsconfig.json`**: TypeScript configuration file.
- **`index.html`**: The main HTML file for the React application.
- **`index.tsx`**: The entry point for the React application.
- **`App.tsx`**: The root component of the React application, which sets up routing.
- **`server/proxy-server.js`**: The main file for the backend Express server.
