
export interface EmulatorConfig {
  id: string;
  name: string;
  executablePath: string;
  args: string;
}

export interface Platform {
  id:string;
  name: string;
  alias?: string; // Added for matching against external API aliases
  iconUrl?: string; // e.g., URL to an SVG or small PNG
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

export type NavView = 'games' | 'platforms' | 'scan' | 'apikeys';