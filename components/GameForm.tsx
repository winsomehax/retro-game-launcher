
import React, { useState, useEffect } from 'react';
import { Game, Platform } from '../types';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { Button } from './Button';
import { Modal } from './Modal';
import { CloudDownloadIcon, SparklesIcon, SpinnerIcon } from './Icons';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

interface GameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (game: Game) => void;
  platforms: Platform[];
  initialGame?: Game | null;
  theGamesDbApiKey?: string;
  geminiApiKey?: string;
}

// Types for TheGamesDB API response
interface TheGamesDbGame {
  id: number;
  game_title: string;
  release_date?: string;
  platform: number; // Platform ID from TheGamesDB
  overview?: string;
  genres?: { id: number; name: string }[];
}

interface TheGamesDbPlatformData {
  id: number;
  name: string;
  alias: string;
}

interface TheGamesDbBoxartImage {
  id: number;
  type: string;
  side?: string;
  filename: string;
}

interface TheGamesDbIncludeData {
  boxart?: {
    base_url?: { original?: string };
    data?: { [gameId: string]: TheGamesDbBoxartImage[] };
  };
  platform?: {
    data?: { [platformId: string]: TheGamesDbPlatformData };
  };
}

const defaultGame: Omit<Game, 'id'> = {
  title: '',
  platformId: '',
  romPath: '',
  coverImageUrl: '',
  description: '',
  genre: '',
  releaseDate: '',
};

export const GameForm: React.FC<GameFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  platforms, 
  initialGame,
  theGamesDbApiKey,
  geminiApiKey
}) => {
  const [gameData, setGameData] = useState<Omit<Game, 'id'>>(initialGame || defaultGame);
  const [isFetchingDB, setIsFetchingDB] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<TheGamesDbGame[]>([]);
  const [searchIncludeData, setSearchIncludeData] = useState<TheGamesDbIncludeData | undefined>(undefined);
  const [isGameSelectionModalOpen, setIsGameSelectionModalOpen] = useState(false);

  useEffect(() => {
    if (initialGame) {
      setGameData(initialGame);
    } else {
      setGameData(defaultGame);
    }
    setApiError(null); // Reset API error when form opens or initial game changes
    setSearchResults([]);
    setSearchIncludeData(undefined);
    setIsGameSelectionModalOpen(false);
  }, [initialGame, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGameData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameData.platformId) {
        alert("Please select a platform.");
        return;
    }
    const fullGameData: Game = {
      ...gameData,
      id: initialGame?.id || crypto.randomUUID(),
    };
    onSubmit(fullGameData);
  };

  const handleFetchFromGamesDB = async () => {
    if (!theGamesDbApiKey) {
      setApiError("TheGamesDB API key is not configured.");
      return;
    }
    if (!gameData.title) {
      setApiError("Please enter a game title to fetch information.");
      return;
    }
    setIsFetchingDB(true);
    setApiError(null);
    try {
      // Using API v1.1 and specific fields for form population + include for boxart and platform details
      const fields = "overview,genres,release_date,platform";
      const include = "boxart,platform";
      //const apiUrl = `https://api.thegamesdb.net/v1.1/Games/ByGameName?apikey=${theGamesDbApiKey}&name=${encodeURIComponent(gameData.title)}&fields=${fields}&include=${include}`;
      const apiUrl = `http://localhost:3001/api/thegamesdb/v1.1/Games/ByGameName?name=${encodeURIComponent(gameData.title)}&fields=${fields}&include=${include}`;

      console.log("Fetching from TheGamesDB URL:", apiUrl); // Log the URL
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TheGamesDB API request failed: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
      }
      const apiResponse = await response.json();
      console.log("Full response from TheGamesDB:", apiResponse); // Log the full response
      
      if (apiResponse.data && apiResponse.data.games && apiResponse.data.games.length > 0) {
        setSearchResults(apiResponse.data.games);
        setSearchIncludeData(apiResponse.include);
        setIsGameSelectionModalOpen(true);
      } else {
        setApiError("No game found on TheGamesDB with that title.");
        setSearchResults([]);
        setSearchIncludeData(undefined);
      }
    } catch (error) {
      console.error("Error fetching from TheGamesDB:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred while fetching from TheGamesDB.");
      setSearchResults([]);
      setSearchIncludeData(undefined);
    } finally {
      setIsFetchingDB(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!geminiApiKey) {
      setApiError("Gemini API key is not configured.");
      return;
    }
    if (!gameData.title) {
      setApiError("Please enter a game title to generate a description.");
      return;
    }
    setIsGeneratingDesc(true);
    setApiError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const platformName = platforms.find(p => p.id === gameData.platformId)?.name || "Unknown Platform";
      const prompt = `Generate a compelling and concise game description (around 2-3 sentences) for a retro game titled "${gameData.title}" for the "${platformName}" platform. Its genre is "${gameData.genre || 'not specified'}". Focus on the core gameplay or unique aspects.`;
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17', // Correct model
        contents: prompt,
      });
      
      setGameData(prev => ({
        ...prev,
        description: response.text?.trim() || prev.description,
      }));

    } catch (error) {
      console.error("Error generating description with Gemini:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred while generating description.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGameSelectedFromSearch = (
    selectedTGDBGame: TheGamesDbGame,
    tgdbPlatformName: string | undefined,
    coverImgUrl: string
  ) => {
    const matchedPlatform = platforms.find(p =>
        tgdbPlatformName && p.name.toLowerCase() === tgdbPlatformName.toLowerCase()
    );

    setGameData(prev => ({
        ...prev,
        title: selectedTGDBGame.game_title,
        description: selectedTGDBGame.overview || prev.description,
        genre: (selectedTGDBGame.genres && selectedTGDBGame.genres.length > 0 ? selectedTGDBGame.genres[0].name : prev.genre) || '',
        releaseDate: selectedTGDBGame.release_date ? new Date(selectedTGDBGame.release_date).getFullYear().toString() : prev.releaseDate,
        coverImageUrl: coverImgUrl || prev.coverImageUrl,
        platformId: matchedPlatform ? matchedPlatform.id : '',
    }));

    let currentApiError = null;
    if (!matchedPlatform && tgdbPlatformName) {
        currentApiError = `Platform "${tgdbPlatformName}" from TheGamesDB was not found in your configured platforms. Please select a platform manually.`;
    }
    setApiError(currentApiError);

    setIsGameSelectionModalOpen(false);
    setSearchResults([]);
    setSearchIncludeData(undefined);
  };

  const platformOptions = platforms.map(p => ({ value: p.id, label: p.name }));

  // Close search results modal if the main form modal is closed
  const handleMainModalClose = () => { setIsGameSelectionModalOpen(false); onClose(); };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={initialGame ? 'Edit Game' : 'Add New Game'}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" form="game-form" variant="primary" disabled={isFetchingDB || isGeneratingDesc}>
                    {initialGame ? 'Save Changes' : 'Add Game'}
                </Button>
            </>
        }
        size="lg"
    >
      {isGameSelectionModalOpen && searchResults.length > 0 && (
        <GameSearchResultsModal
          isOpen={isGameSelectionModalOpen}
          onClose={() => setIsGameSelectionModalOpen(false)}
          games={searchResults}
          includeData={searchIncludeData}
          onSelectGame={handleGameSelectedFromSearch}
          platforms={platforms}
        />
      )}
      <form id="game-form" onSubmit={handleSubmit} className="space-y-4">
        {apiError && <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md">{apiError}</p>}
        
        <div className="flex items-end space-x-2">
            <Input 
                label="Title" 
                name="title" 
                value={gameData.title} 
                onChange={handleChange} 
                required 
                containerClassName="flex-grow"
                disabled={isFetchingDB || isGeneratingDesc}
            />
            <Button 
                type="button" 
                onClick={handleFetchFromGamesDB} 
                disabled={!theGamesDbApiKey || isFetchingDB || isGeneratingDesc || !gameData.title}
                leftIcon={isFetchingDB ? <SpinnerIcon className="w-4 h-4" /> : <CloudDownloadIcon className="w-4 h-4"/>}
                size="md"
                variant="secondary"
                className="mb-4 whitespace-nowrap"
                title="Fetch game info from TheGamesDB"
            >
                {isFetchingDB ? 'Fetching...' : 'Fetch Info'}
            </Button>
        </div>

        <Select 
          label="Platform" 
          name="platformId" 
          value={gameData.platformId} 
          onChange={handleChange} 
          options={platformOptions} 
          placeholder="Select a platform"
          required 
          disabled={isFetchingDB || isGeneratingDesc}
        />
        <Input 
            label="ROM Path" 
            name="romPath" 
            value={gameData.romPath} 
            onChange={handleChange} 
            placeholder="e.g., /roms/platform/game.zip" 
            disabled={isFetchingDB || isGeneratingDesc}
        />
        <Input 
            label="Cover Image URL" 
            name="coverImageUrl" 
            value={gameData.coverImageUrl} 
            onChange={handleChange} 
            placeholder="e.g., https://example.com/cover.jpg" 
            disabled={isFetchingDB || isGeneratingDesc}
        />
        
        <div className="flex items-end space-x-2">
            <Textarea 
                label="Description" 
                name="description" 
                value={gameData.description} 
                onChange={handleChange} 
                containerClassName="flex-grow"
                disabled={isFetchingDB || isGeneratingDesc}
            />
            <Button 
                type="button" 
                onClick={handleGenerateDescription}
                disabled={!geminiApiKey || isGeneratingDesc || isFetchingDB || !gameData.title}
                leftIcon={isGeneratingDesc ? <SpinnerIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4"/>}
                size="md"
                variant="secondary"
                className="mb-4 whitespace-nowrap"
                title="Generate description with Gemini AI"
            >
                {isGeneratingDesc ? 'Generating...' : 'Generate'}
            </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Genre" 
            name="genre" 
            value={gameData.genre} 
            onChange={handleChange} 
            disabled={isFetchingDB || isGeneratingDesc}
          />
          <Input 
            label="Release Date" 
            name="releaseDate" 
            value={gameData.releaseDate} 
            onChange={handleChange} 
            placeholder="e.g., 1990 or YYYY-MM-DD" 
            disabled={isFetchingDB || isGeneratingDesc}
          />
        </div>
      </form>
    </Modal>
  );
};

interface GameSearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: TheGamesDbGame[];
  includeData?: TheGamesDbIncludeData;
  onSelectGame: (game: TheGamesDbGame, platformName: string | undefined, coverImageUrl: string) => void;
  platforms: Platform[]; // Passed for potential future use, not strictly needed if platform name comes from includeData
}

const GameSearchResultsModal: React.FC<GameSearchResultsModalProps> = ({
  isOpen,
  onClose,
  games,
  includeData,
  onSelectGame,
}) => {
  const getCoverImageUrlFromTGDB = (gameId: number, currentIncludeData?: TheGamesDbIncludeData): string => {
    if (!currentIncludeData?.boxart?.data || !currentIncludeData?.boxart?.base_url?.original) {
      return '';
    }
    const gameBoxarts = currentIncludeData.boxart.data[gameId.toString()];
    if (!gameBoxarts || gameBoxarts.length === 0) {
      return '';
    }
    let preferredBoxart = gameBoxarts.find(img => img.type === 'boxart' && img.side === 'front');
    if (!preferredBoxart) {
      preferredBoxart = gameBoxarts.find(img => img.type === 'boxart');
    }
    if (!preferredBoxart && gameBoxarts.length > 0) {
      preferredBoxart = gameBoxarts[0];
    }
    if (preferredBoxart) {
      return currentIncludeData.boxart.base_url.original + preferredBoxart.filename;
    }
    return '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Game from TheGamesDB" size="xl">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
        {games.map(game => {
          const platformName = includeData?.platform?.data?.[game.platform.toString()]?.name;
          const coverImageUrl = getCoverImageUrlFromTGDB(game.id, includeData);
          return (
            <div key={game.id} className="flex items-center space-x-4 p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-md">
              <img 
                src={coverImageUrl || 'https://via.placeholder.com/60x80.png?text=No+Art'} 
                alt={game.game_title} 
                className="w-16 h-20 object-cover rounded flex-shrink-0 bg-slate-800" 
              />
              <div className="flex-grow">
                <h3 className="font-semibold text-base">{game.game_title}</h3>
                <p className="text-sm text-slate-400">
                  Platform: {platformName || `ID: ${game.platform}`}{game.release_date ? ` (${new Date(game.release_date).getFullYear()})` : ''}
                </p>
              </div>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => onSelectGame(game, platformName, coverImageUrl)}
              >
                Select
              </Button>
            </div>
          );
        })}
        {games.length === 0 && <p>No results found.</p>}
      </div>
       <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};