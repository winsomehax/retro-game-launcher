
export interface EmulatorConfig {
  id: string;
  name: string;
  executablePath: string;
  args: string;
}

export interface Platform {
  // Fields from TheGamesDB
  id: number; // Numeric ID from TheGamesDB
  name: string;
  alias?: string;
  icon?: string; // Filename or path for the icon from TheGamesDB
  console?: string;
  controller?: string;
  developer?: string;
  manufacturer?: string;
  media?: string;
  cpu?: string;
  memory?: string;
  graphics?: string;
  sound?: string;
  maxcontrollers?: string;
  display?: string;
  overview?: string;
  youtube?: string; // URL to a YouTube video

  // User-defined/managed fields
  userIconUrl?: string; // User-provided icon URL, can override or supplement TGDB's icon
  emulators: EmulatorConfig[];
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

export type NavView = 'games' | 'platforms' | 'settings' | 'apikeys';

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