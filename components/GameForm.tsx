
import React, { useState, useEffect } from 'react';
import { Game, Platform } from '../types';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { Button } from './Button';
import { Modal } from './Modal';
import { CloudDownloadIcon, SparklesIcon, SpinnerIcon } from './Icons';
// import { GoogleGenAI, GenerateContentResponse } from '@google/genai'; // No longer used directly

interface GameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (game: Game) => void;
  platforms: Platform[];
  initialGame?: Game | null;
  onAddPlatform: (platformToAdd: { id: string; name: string; alias?: string }) => void; // Added prop
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

// Interface for the transformed game object from our proxy server
interface TransformedGameFromProxy {
  id: number;
  title: string;
  release_date?: string;
  platform_id: number; // This is the original ID from TheGamesDB
  source_platform_details?: { // Full details from thegamesdb_platforms.json via server
    id: number; // TGDB's own ID for the platform
    name: string;
    alias: string;
  };
  overview?: string;
  boxart_url?: string;
  // Redundant fields removed as they are now within source_platform_details
  // platform_name_from_source?: string;
  // platform_alias_from_source?: string;
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
  onAddPlatform, // Destructure the new prop
  theGamesDbApiKey,
  geminiApiKey
}) => {
  const [gameData, setGameData] = useState<Omit<Game, 'id'>>(initialGame || defaultGame);
  const [isFetchingDB, setIsFetchingDB] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<TransformedGameFromProxy[]>([]); // Changed type
  const [searchIncludeData, setSearchIncludeData] = useState<TheGamesDbIncludeData | undefined>(undefined); // This is no longer used by modal
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
      // Using the new proxy server endpoint for TheGamesDB
      const fields = "overview,genres,release_date,platform"; // These are TheGamesDB specific fields
      const include = "boxart,platform"; // These are TheGamesDB specific includes
      const apiUrl = `http://localhost:3001/api/search/thegamesdb/bygamename?name=${encodeURIComponent(gameData.title)}&fields=${fields}&include=${include}`;

      console.log("Fetching from proxy server (TheGamesDB):", apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.message || errorData.error || ''}`);
      }
      const apiResponse = await response.json();
      console.log("Full response from proxy (TheGamesDB):", apiResponse);
      
      // Adjusted to match the transformed response structure from the proxy
      if (apiResponse.games && apiResponse.games.length > 0) {
        // The proxy now returns a simplified `games` array.
        // We need to adapt how we store/use this data if the structure is different from original TheGamesDB.
        // For now, assuming `apiResponse.games` contains the games array directly.
        // And `apiResponse.include` might still be there if the proxy forwards it, or it might be incorporated.
        // Based on the new server code, the response is { source, count, games, pages, remaining_allowance }
        // The `games` objects are transformed. `searchIncludeData` might not be directly available or needed in the same way.

        // Map the transformed game data to TheGamesDbGame structure if needed for existing modal
        // Or update the modal to use the new simpler structure.
        // The proxy returns `TransformedGameFromProxy[]` in `apiResponse.games`.
        // Set this directly to the searchResults state.
        setSearchResults(apiResponse.games);

        // `searchIncludeData` is no longer needed from the proxy in this new structure,
        // as boxart_url is part of each game, and platform name can be looked up from local `platforms` list.
        setSearchIncludeData(undefined);

        setIsGameSelectionModalOpen(true);
      } else {
        setApiError(apiResponse.message || "No game found with that title via proxy.");
        setSearchResults([]);
        setSearchIncludeData(undefined);
      }
    } catch (error) {
      console.error("Error fetching from proxy (TheGamesDB):", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred while fetching from TheGamesDB via proxy.");
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
      const platformName = platforms.find(p => p.id === gameData.platformId)?.name || "Unknown Platform";
      const prompt = `Generate a compelling and concise game description (around 2-3 sentences) for a retro game titled "${gameData.title}" for the "${platformName}" platform. Its genre is "${gameData.genre || 'not specified'}". Focus on the core gameplay or unique aspects.`;

      const apiUrl = `http://localhost:3001/api/gemini/generatecontent`;
      console.log("Requesting description from proxy (Gemini):", apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.message || errorData.error || ''}`);
      }

      const apiResponse = await response.json();
      console.log("Full response from proxy (Gemini):", apiResponse);

      if (apiResponse.generated_text) {
        setGameData(prev => ({
          ...prev,
          description: apiResponse.generated_text.trim(),
        }));
      } else {
        throw new Error("No generated text found in API response.");
      }

    } catch (error) {
      console.error("Error generating description with proxy (Gemini):", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred while generating description via proxy.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGameSelectedFromSearch = (
    selectedTGDBGame: TheGamesDbGame,
  sourcePlatformDetails: { id: number; name: string; alias: string } | undefined,
  coverImgUrl: string
  ) => {
  console.log(`handleGameSelectedFromSearch - Received Source Platform Details:`, sourcePlatformDetails);
  console.log("Local platforms for matching:", platforms.map(p => ({ id: p.id, name: p.name, alias: p.alias })));

  let matchedPlatform: Platform | undefined = undefined;
  let finalPlatformIdToSet: string = '';
  let apiMessage = null;

  if (sourcePlatformDetails) {
    // Try to find existing local platform
    matchedPlatform = platforms.find(p =>
      p.id === sourcePlatformDetails.id.toString() || // Match by TGDB ID (converted to string)
      p.name.toLowerCase() === sourcePlatformDetails.name.toLowerCase() ||
      (p.alias && sourcePlatformDetails.alias && p.alias.toLowerCase() === sourcePlatformDetails.alias.toLowerCase()) ||
      (p.alias && p.alias.toLowerCase() === sourcePlatformDetails.name.toLowerCase()) || // Match local alias against TGDB name
      (sourcePlatformDetails.alias && p.name.toLowerCase() === sourcePlatformDetails.alias.toLowerCase()) // Match local name against TGDB alias
    );

    console.log("Attempt 1: Matched local platform:", matchedPlatform);

    if (matchedPlatform) {
      finalPlatformIdToSet = matchedPlatform.id;
    } else {
      // No local match found, so add this platform from TGDB source
      console.log(`Platform "${sourcePlatformDetails.name}" (ID: ${sourcePlatformDetails.id}) not found locally. Adding it.`);
      const newPlatformData = {
        id: sourcePlatformDetails.id.toString(), // Use TGDB ID as string for local ID
        name: sourcePlatformDetails.name,
        alias: sourcePlatformDetails.alias || '', // Ensure alias is a string
      };
      props.onAddPlatform(newPlatformData); // Call prop passed from App.tsx
      finalPlatformIdToSet = newPlatformData.id; // Use the ID of the (to be) newly added platform
      apiMessage = `Platform "${sourcePlatformDetails.name}" was not found locally and has been added to your platforms.`;
      // Note: The 'platforms' prop might not update immediately within this function's closure.
      // The selection to the form field will use the ID, and App.tsx state update will make it available later.
    }
  } else {
    apiMessage = "No platform information received from TheGamesDB search. Please select a platform manually.";
  }

  setApiError(apiMessage);

    setGameData(prev => ({
        ...prev,
        title: selectedTGDBGame.game_title,
        description: selectedTGDBGame.overview || prev.description,
        genre: (selectedTGDBGame.genres && selectedTGDBGame.genres.length > 0 ? selectedTGDBGame.genres[0].name : prev.genre) || '',
        releaseDate: selectedTGDBGame.release_date ? new Date(selectedTGDBGame.release_date).getFullYear().toString() : prev.releaseDate,
        coverImageUrl: coverImgUrl || prev.coverImageUrl,
      platformId: finalPlatformIdToSet, // Set with matched or new ID
    }));

    setIsGameSelectionModalOpen(false);
    setSearchResults([]);
    setSearchIncludeData(undefined);
  };

  const platformOptions = platforms.map(p => ({ value: p.id, label: p.name }));

  // Close search results modal if the main form modal is closed
  // const handleMainModalClose = () => { setIsGameSelectionModalOpen(false); onClose(); }; // Unused

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

// Interface for the transformed game object from our proxy server (moved before use)
interface TransformedGameFromProxy {
  id: number;
  title: string;
  release_date?: string;
  platform_id: number;
  platform_name_from_source?: string;
  platform_alias_from_source?: string;
  overview?: string;
  boxart_url?: string;
}

interface GameSearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: TransformedGameFromProxy[]; // Correct type for games
  onSelectGame: (
    game: TheGamesDbGame,
    sourcePlatformDetails: { id: number; name: string; alias: string } | undefined, // Pass full object
    coverImageUrl: string
  ) => void;
  // platforms prop is no longer strictly needed by the modal itself for display,
  // but kept if other reasons exist or for future fallback logic.
  platforms: Platform[];
}

const GameSearchResultsModal: React.FC<GameSearchResultsModalProps> = ({
  isOpen,
  onClose,
  games,
  onSelectGame,
  platforms, // Kept for now
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Game from TheGamesDB" size="xl">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
        {games.map(game => {
          console.log(`Modal item - Game: "${game.title}", Platform ID: ${game.platform_id}, SourceDetails:`, game.source_platform_details);
          const displayPlatformName = game.platform_name_from_source || `ID: ${game.platform_id}`;
          const coverImageUrl = game.boxart_url || '';

          const gameForSelection: TheGamesDbGame = {
            id: game.id,
            game_title: game.title,
            release_date: game.release_date,
            platform: game.platform_id,
            overview: game.overview,
          };

          return (
            <div key={game.id} className="flex items-center space-x-4 p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-md">
              <img 
                src={coverImageUrl || 'https://via.placeholder.com/60x80.png?text=No+Art'} 
                alt={game.title}
                className="w-16 h-20 object-cover rounded flex-shrink-0 bg-slate-800" 
              />
              <div className="flex-grow">
                <h3 className="font-semibold text-base">{game.title}</h3>
                <p className="text-sm text-slate-400">
                  Platform: {displayPlatformName}{game.release_date ? ` (${new Date(game.release_date).getFullYear()})` : ''}
                </p>
              </div>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => onSelectGame(gameForSelection, game.source_platform_details, coverImageUrl)}
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