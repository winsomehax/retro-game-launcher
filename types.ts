
export interface EmulatorConfig {
  id: string;
  name: string;
  executablePath: string;
  args: string;
}

export interface Platform extends TheGamesDBPlatform {
  id: number; // Now a number, from TheGamesDB
  userIconUrl?: string; // User-overridden icon URL
  emulators: string[]; // Array of emulator IDs
}

export interface Game {
  id: string;
  title: string;
  platformId: string;
  romPath: string;
  coverImageUrl: string;
  description: string;
  genre: string;
  releaseDate: string; // Could be year or full date
}

export interface ApiKeyEntry {
  id: string;
  serviceName: string;
  apiKey: string;
}

export type NavView = 'games' | 'platforms' | 'emulators' | 'settings' | 'scan-roms';

// Added for TheGamesDB Platform Images API
export interface TheGamesDBImage {
  id: number;
  type: 'fanart' | 'banner' | 'boxart' | string; // Allow other types from API
  filename: string;
  // side?: string; // e.g., "front", "back" for boxart
  // resolution?: string; // e.g., "1920x1080"
}

export interface TheGamesDBPlatformImagesResponse {
  base_url: {
    original: string;
    small?: string;
    thumb?: string;
    cropped_center_thumb?: string;
    medium?: string;
    large?: string;
  };
  images: TheGamesDBImage[];
}