# XYZZY

This is a React-based retro game launcher intended for local desktop use. It features a frontend for managing your game library and a backend API server to fetch game information from external services like TheGamesDB, RAWG, and generate descriptions using Google's Gemini.

## Features

- Browse and manage your retro game collection.
- Fetch game details (metadata, box art) from TheGamesDB.
- Search for game information on RAWG.
- Generate game descriptions using Google's Gemini AI.
- Configure emulators and platforms.
- Launch games using configured emulators.

## Project Structure

- `src/` (or root for `App.tsx`, `index.tsx`, etc.): Contains the React frontend application.
  - `components/`: Reusable UI components.
  - `pages/`: Top-level page components.
  - `hooks/`: Custom React hooks.
  - `data/`: Local data files (e.g., `games.json`, `platforms.json`).
- `server/`: Contains the Node.js Express API server.
  - `proxy-server.js`: The main file for the backend API server.
- `public/`: Static assets for the frontend.

## Running Locally

**Prerequisites:**

- Node.js (v16 or later recommended)
- npm (usually comes with Node.js)

**Setup:**

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

3.  **Install server dependencies:**
    Navigate to the server directory and install its dependencies.
    ```bash
    cd server
    npm install
    cd ..
    ```
    *(Note: If the server's `package.json` is minimal or doesn't exist, you might need to create one and add `express`, `axios`, `cors`, `dotenv` as dependencies if they are not already managed by the root `package.json` for a monorepo-like setup. Based on the current structure, the server seems to be using ES Modules, so ensure your Node version supports this or adjust server code accordingly.)*

4.  **Configure Environment Variables:**
    The backend server requires API keys for external services. Create a `.env` file in the `server/` directory (i.e., `server/.env`). Add the following variables:

    ```env
    # API server port (default is 3001 if not specified)
    PORT=3001

    # URL of the frontend application (for CORS configuration)
    # This MUST match the URL your frontend development server is running on.
    # Common defaults are http://localhost:5173 (Vite) or http://localhost:3000 (Create React App).
    # Update this value if your frontend runs on a different port.
    FRONTEND_URL=http://localhost:5173

    # API Keys for external services
    THEGAMESDB_API_KEY=your_thegamesdb_api_key
    RAWG_API_KEY=your_rawg_api_key
    GEMINI_API_KEY=your_gemini_api_key

    # (Optional) Proxy Secret for an additional layer of security on API calls
    # If set, requests to the backend API must include an 'X-Proxy-Secret' header with this value.
    # PROXY_SECRET=your_strong_secret_key

    # (Optional) Timeout for external API calls in milliseconds (default: 10000ms = 10s)
    EXTERNAL_API_TIMEOUT=10000
    ```
    Replace `your_..._api_key` with your actual API keys. You can obtain these from the respective service websites (TheGamesDB.net, RAWG.io, Google AI Studio for Gemini).

5.  **Run the API Server:**
    Open a terminal and navigate to the `server/` directory.
    ```bash
    cd server
    node proxy-server.js
    ```
    The API server should start, typically on `http://localhost:3001`.

6.  **Run the Frontend Application:**
    Open another terminal in the project root directory.
    ```bash
    npm run dev
    ```
    This will usually start the React development server (e.g., Vite on `http://localhost:5173` or Create React App on `http://localhost:3000`). Check your `package.json` for the exact command and port.

    Ensure the `FRONTEND_URL` in `server/.env` matches the address your frontend is running on.

## API Server Endpoints

The backend server (`server/proxy-server.js`) provides the following endpoints:

-   **`GET /api/search/thegamesdb/bygamename`**: Searches for games on TheGamesDB by name.
    -   Query Parameters:
        -   `name` (required): The name of the game to search for.
        -   `fields` (optional): Comma-separated list of fields to include from TheGamesDB.
        -   `include` (optional): Comma-separated list of related data to include (e.g., `boxart`, `platform`).
        -   `page` (optional): For pagination.
    -   Example: `/api/search/thegamesdb/bygamename?name=Zelda&include=boxart`

-   **`GET /api/search/rawg/games`**: Searches for games on RAWG.
    -   Query Parameters:
        -   `search` (required): The search term.
        -   `page` (optional): Page number for results.
        -   `page_size` (optional): Number of results per page.
    -   Example: `/api/search/rawg/games?search=Witcher`

-   **`POST /api/gemini/generatecontent`**: Generates content (e.g., game descriptions) using Google's Gemini API.
    -   Request Body (JSON):
        ```json
        {
          "contents": [{ "parts": [{ "text": "Your prompt here" }] }]
        }
        ```
    -   Example: Send a POST request with the above JSON structure to `/api/gemini/generatecontent`.

-   **`POST /api/games/launch`**: Launches a game using the configured emulator.
    -   Request Body (JSON):
        ```json
        {
          "romPath": "/path/to/your/rom.nes",
          "platformId": "platform_id_from_platforms.json",
          "emulatorId": "emulator_id_configured_for_the_platform"
        }
        ```
    -   The server uses Node.js `child_process` to execute the emulator.

## Development Notes

-   **API Key Management**: All API keys for external services (TheGamesDB, RAWG, Gemini) are managed exclusively by the backend server. They are configured in the `server/.env` file and are never exposed to the frontend client. The frontend makes requests to the local proxy server, which then injects the necessary API keys before forwarding requests to external services.
-   **Emulator Launching**: Game launching is handled by the backend `/api/games/launch` endpoint. The frontend sends the ROM path, platform ID, and emulator ID. The backend looks up the emulator configuration (executable path and command-line arguments) from `server/data/platforms.json` and uses Node.js `child_process.spawn` to run the emulator.
    -   Emulator command-line arguments can use `{romPath}` as a placeholder for the game's ROM file path and `{emulatorPath}` for the emulator's executable path.
-   Ensure your `.env` file in the `server/` directory is correctly configured with API keys before running the application.
-   The API server uses `server/data/thegamesdb_platforms.json` to map TheGamesDB platform IDs to their names and aliases. This file is based on data from TheGamesDB API and might need to be updated periodically if TheGamesDB adds or changes platforms.
-   When fetching game information from TheGamesDB, if a game's platform is not found in your local `data/platforms.json` (by matching ID, name, or alias), the application will attempt to add it automatically to `data/platforms.json` using the information (ID, name, alias) from `server/thegamesdb_platforms.json`.
-   The application relies on local JSON files (`server/data/games.json`, `server/data/platforms.json`) for storing user game data and platform configurations. These are managed by the backend API and updated by the frontend through API calls.
