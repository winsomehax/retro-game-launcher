# Retro Game Launcher

This is a React-based retro game launcher intended for local desktop use. It features a frontend for managing your game library and a backend API server to fetch game information from external services like TheGamesDB, RAWG, and generate descriptions using Google's Gemini.

## Features

- Browse and manage your retro game collection.
- Fetch game details (metadata, box art) from TheGamesDB.
- Search for game information on RAWG.
- Generate game descriptions using Google's Gemini AI.
- Configure emulators and platforms.

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
    Replace `your_..._api_key` with your actual API keys. You can obtain these from the respective service websites (TheGamesDB.net, RAWG.io, Google AI Studio for Gemini). The `FRONTEND_URL` variable is no longer needed for development as the Vite dev server will proxy API requests.

5.  **Run the Development Servers:**
    To run both the frontend and backend servers concurrently, open a terminal in the project root directory and run:
    ```bash
    npm run dev
    ```
    This command uses `npm-run-all` to start the backend Node.js server (on `http://localhost:3001`) and the frontend Vite dev server (typically on `http://localhost:5173`). The Vite server is configured to proxy any `/api` requests to the backend, which simplifies development and avoids CORS issues.

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

-   **`POST /api/data/platforms`**: Saves the entire list of platforms to `public/data/platforms.json`.
    -   Request Body (JSON): An array of `Platform` objects.

-   **`POST /api/data/games`**: Saves the entire list of games to `public/data/games.json`.
    -   Request Body (JSON): An array of `Game` objects.

## Development Notes

-   The frontend dev server (Vite) is configured to proxy all requests from `/api` to the backend server running on `http://localhost:3001`. This avoids CORS issues during development and removes the need to hardcode the server URL in the frontend code.
-   Ensure your `.env` file in the `server/` directory is correctly configured with API keys before running the application.
-   The API server uses `server/thegamesdb_platforms.json` to map TheGamesDB platform IDs to their names and aliases. This file is based on data from TheGamesDB API and might need to be updated periodically if TheGamesDB adds or changes platforms. The mechanism for updating this file is currently manual.
-   The application relies on local JSON files (`data/games.json`, `data/platforms.json`) for storing user game data and platform configurations. These are typically managed by the frontend.
-   **Data Persistence**: When a game or platform is added, edited, or deleted, the frontend application sends the entire updated list to the backend via the `/api/data/games` or `/api/data/platforms` endpoints. The server is responsible for overwriting the corresponding JSON file in the `public/data/` directory. This ensures that changes are persisted across sessions.
-   **Automatic Platform Addition**: When fetching game information from TheGamesDB, if a game's platform is not found in your local `data/platforms.json` (by matching ID, name, or alias), the application will add it to your collection. This change is then persisted to `public/data/platforms.json`, keeping your platform list up-to-date.
