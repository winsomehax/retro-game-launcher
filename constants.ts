
import { ApiKeyEntry, Game } from './types';

// INITIAL_GAMES is now loaded from data/games.json
// The INITIAL_PLATFORMS constant was previously removed.

export const THEGAMESDB_API_KEY_ID = "thegamesdb-api-key";
export const SERVICE_NAME_THEGAMESDB = "TheGamesDB";

export const GEMINI_API_KEY_ID = "gemini-api-key";
export const SERVICE_NAME_GEMINI = "Gemini API";

export const createDefaultApiKeyEntry = (id: string, serviceName: string): ApiKeyEntry => ({
  id,
  serviceName,
  apiKey: '',
});
