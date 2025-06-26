import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Platform, Game, EmulatorConfig, NavView, ApiKeyEntry } from './types';
import { Navbar } from './components/Navbar';
import { GamesView } from './pages/GamesView';
import { PlatformsView } from './pages/PlatformsView';
import { ScanView } from './pages/ScanView';
import { ApiKeysView } from './pages/ApiKeysView';
import { 
  THEGAMESDB_API_KEY_ID, 
  SERVICE_NAME_THEGAMESDB, 
  GEMINI_API_KEY_ID, 
  SERVICE_NAME_GEMINI,
  createDefaultApiKeyEntry 
} from './constants';


// Helper function to load initial API keys
const loadInitialApiKeys = async (): Promise<ApiKeyEntry[]> => {
  try {
    const response = await fetch('/api/env/keys');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for /api/env/keys`);
    }
    const loadedKeys = await response.json();
    const apiKeys = Object.entries(loadedKeys).map(([key, value]) => {
      return { id: key, serviceName: key, apiKey: value as string };
    });
    return apiKeys;
  } catch (error) {
    console.error("Could not load API keys from server, using defaults:", error);
    // Default fallback
    return [];
  }
};



const AppContent: React.FC = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[] | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // State to track if initial data load is complete
  const [isInitialGamesLoadComplete, setIsInitialGamesLoadComplete] = useState(false);
  const [isInitialPlatformsLoadComplete, setIsInitialPlatformsLoadComplete] = useState(false);

  useEffect(() => {
    // Load platforms from the backend API
    fetch('/api/data/platforms')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for /api/data/platforms`);
        return response.json();
      })
      .then((data: Platform[]) => {
        const sortedData = data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        setPlatforms(sortedData);
        setIsInitialPlatformsLoadComplete(true);
      })
      .catch(error => {
        console.error("Could not load platforms from API:", error);
        setPlatforms([]); // Initialize with empty array on error
        setIsInitialPlatformsLoadComplete(true);
      });

    // Load games from the backend API
    fetch('/api/data/games')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for /api/data/games`);
        return response.json();
      })
      .then((data: Game[]) => {
        setGames(data);
        setIsInitialGamesLoadComplete(true);
      })
      .catch(error => {
        console.error("Could not load games from API:", error);
        setGames([]); // Initialize with empty array on error
        setIsInitialGamesLoadComplete(true);
      });

    loadInitialApiKeys().then(keys => {
      setApiKeys(keys);
    });
  }, []);


  // Effect to save games when `games` state changes (after initial load)
  useEffect(() => {
    if (isInitialGamesLoadComplete && games.length > 0) { // Added games.length > 0 to avoid saving empty array if initial load fails but sets complete
      saveDataToBackend('/api/data/games', games, 'Games');
    } else if (isInitialGamesLoadComplete && games.length === 0) {
        // If initial load is done and games array is empty (e.g. user deletes all games)
        // We might want to save this empty state.
        // Or, if this is an undesirable state right after initial load (e.g. games.json was empty/corrupt)
        // we might add a delay or a more robust check. For now, let's save empty if it's intentional.
        console.log("Initial games load complete, games array is empty. Attempting to save empty games list.");
        saveDataToBackend('/api/data/games', [], 'Games (empty list)');
    }
  }, [games, isInitialGamesLoadComplete]); // Dependency array includes games and the load completion flag

  // Effect to save platforms when `platforms` state changes (after initial load)
  useEffect(() => {
    if (isInitialPlatformsLoadComplete && platforms.length > 0) {
      saveDataToBackend('/api/data/platforms', platforms, 'Platforms');
    } else if (isInitialPlatformsLoadComplete && platforms.length === 0) {
      // Similar to games, decide if saving an empty platform list is desired immediately after load.
      console.log("Initial platforms load complete, platforms array is empty. Attempting to save empty platforms list.");
      saveDataToBackend('/api/data/platforms', [], 'Platforms (empty list)');
    }
  }, [platforms, isInitialPlatformsLoadComplete]); // Dependency array

  const getCurrentView = (): NavView => {
    const path = location.pathname;
    if (path.startsWith('/platforms')) return 'platforms';
    if (path.startsWith('/scan')) return 'scan';
    if (path.startsWith('/apikeys')) return 'apikeys';
    return 'games';
  };
  
  const [currentView, setCurrentView] = useState<NavView>(getCurrentView());

  useEffect(() => {
    setCurrentView(getCurrentView());
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleNavigation = (view: NavView) => {
    setCurrentView(view);
    navigate(`/${view}`);
  };

  const handleAddGame = useCallback((game: Game) => setGames(prev => [...prev, game]), []);
  const handleUpdateGame = useCallback((updatedGame: Game) => setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g)), []);
  const handleDeleteGame = useCallback((gameId: string) => setGames(prev => prev.filter(g => g.id !== gameId)), []);

  // New function for adding multiple games
  const handleAddMultipleGames = useCallback((newGames: Game[], platformId: string) => {
    // Optional: Filter out games that might already exist by checking romPath for the given platformId
    setGames(prevGames => {
      const existingRomPaths = new Set(prevGames.filter(g => g.platformId === platformId).map(g => g.romPath));
      const gamesToAdd = newGames.filter(g => !existingRomPaths.has(g.romPath));
      if (gamesToAdd.length < newGames.length) {
        const skippedCount = newGames.length - gamesToAdd.length;
        // TODO: This alert might be better handled in ScanView after the callback, or via a more robust notification system.
        // For now, logging it here. A toast notification system would be ideal.
        console.log(`${skippedCount} game(s) were skipped as they already exist in the library for this platform.`);
        // Consider if ScanView should be informed about skipped games to show a more integrated message.
      }
      return [...prevGames, ...gamesToAdd];
    });
  }, []);

  // Platform CRUD operations
  const handleAddPlatform = useCallback((platformToAdd: Platform) => {
    setPlatforms(prevPlatforms => {
      const existingPlatform = prevPlatforms.find(p => p.id === platformToAdd.id); // ID is number
      if (existingPlatform) {
        console.warn(`Platform with ID ${platformToAdd.id} (${platformToAdd.name}) already exists. Not adding duplicate.`);
        // Optionally, show a user-facing message here
        return prevPlatforms;
      }
      // Ensure emulators array exists, even if platformToAdd doesn't explicitly have it (though Platform type requires it)
      const newPlatformWithEmulators = { ...platformToAdd, emulators: platformToAdd.emulators || [] };
      console.log("Adding new platform to state:", newPlatformWithEmulators);
      const updatedPlatforms = [...prevPlatforms, newPlatformWithEmulators];
      updatedPlatforms.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return updatedPlatforms;
    });
  }, []);

  const handleUpdatePlatform = useCallback((updatedPlatformData: Platform) => {
    setPlatforms(prev => prev.map(p =>
      p.id === updatedPlatformData.id ? { ...p, ...updatedPlatformData } : p // Spread all new data
    ));
  }, []);

  const handleDeletePlatform = useCallback((platformId: number) => { // ID is number
    setPlatforms(prev => prev.filter(p => p.id !== platformId));
    // Also remove games associated with this platformId (platformId in Game is string, needs conversion for comparison)
    setGames(prevGames => prevGames.filter(g => g.platformId !== platformId.toString()));
  }, []);

  const handleAddEmulator = useCallback((platformId: number, emulatorConfig: EmulatorConfig) => { // ID is number
    setPlatforms(prev => prev.map(p =>
      p.id === platformId ? { ...p, emulators: [...p.emulators, {...emulatorConfig, id: emulatorConfig.id || crypto.randomUUID()}] } : p
    ));
  }, []);

  const handleUpdateEmulator = useCallback((platformId: number, updatedEmulatorConfig: EmulatorConfig) => { // ID is number
    setPlatforms(prev => prev.map(p =>
      p.id === platformId ? { ...p, emulators: p.emulators.map(e => e.id === updatedEmulatorConfig.id ? updatedEmulatorConfig : e) } : p
    ));
  }, []);

  const handleDeleteEmulator = useCallback((platformId: number, emulatorId: string) => { // ID is number
    setPlatforms(prev => prev.map(p =>
      p.id === platformId ? { ...p, emulators: p.emulators.filter(e => e.id !== emulatorId) } : p
    ));
  }, []);

  const handleUpdateApiKey = useCallback((updatedApiKey: ApiKeyEntry) => {
    setApiKeys(prevKeys => {
      if (!prevKeys) return null;
      const newKeys = prevKeys.map(key => key.id === updatedApiKey.id ? updatedApiKey : key);
      const keysToSave = newKeys.reduce((acc, key) => {
        acc[key.id] = key.apiKey;
        return acc;
      }, {} as Record<string, string>);

      fetch('/api/env/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keysToSave),
      })
      .then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error during save." }));
          throw new Error(`Failed to save API keys: ${response.status} ${response.statusText}. ${errorData.message || errorData.error || ''}`);
        }
        return response.json();
      })
      .then(result => {
        console.log(`API keys saved successfully:`, result.message);
        // Optionally, you can show a notification to the user to restart the server.
      })
      .catch(error => {
        console.error(`Error saving API keys:`, error);
      });

      return newKeys;
    });
  }, []);

  const theGamesDbApiKey = apiKeys ? (apiKeys.find(k => k.id === THEGAMESDB_API_KEY_ID)?.apiKey || "") : "";
  const geminiApiKey = apiKeys ? (apiKeys.find(k => k.id === GEMINI_API_KEY_ID)?.apiKey || "") : "";

  // Helper function to save data to backend
  const saveDataToBackend = async (endpoint: string, data: any, entityName: string) => {
    try {
      console.log(`Attempting to save ${entityName} data to backend at ${endpoint}:`, data);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error during save." }));
        throw new Error(`Failed to save ${entityName} data: ${response.status} ${response.statusText}. ${errorData.message || errorData.error || ''}`);
      }
      const result = await response.json();
      console.log(`${entityName} data saved successfully:`, result.message);
    } catch (error) {
      console.error(`Error saving ${entityName} data:`, error);
      // TODO: Add user-facing error notification here
    }
  };

  const emulatorsCount = platforms.reduce((acc, p) => acc + p.emulators.length, 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900">
      <Navbar 
        currentView={currentView} 
        onNavigate={handleNavigation} 
        gamesCount={games.length}
        platformsCount={platforms.length}
        emulatorsCount={emulatorsCount}
      />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/games" element={
            <GamesView 
              games={games} 
              platforms={platforms}
              onAddGame={handleAddGame}
              onUpdateGame={handleUpdateGame}
              onDeleteGame={handleDeleteGame}
              onAddPlatform={handleAddPlatform} // Pass down the function
              theGamesDbApiKey={theGamesDbApiKey}
              geminiApiKey={geminiApiKey}
            />
          } />
          <Route path="/platforms" element={
            <PlatformsView 
              platforms={platforms}
              games={games} // Pass games prop
              onAddPlatform={handleAddPlatform}
              onUpdatePlatform={handleUpdatePlatform}
              onDeletePlatform={handleDeletePlatform}
              onAddEmulator={handleAddEmulator}
              onUpdateEmulator={handleUpdateEmulator}
              onDeleteEmulator={handleDeleteEmulator}
            />
          } />
          <Route path="/scan" element={
            <ScanView
              geminiApiKeyConfigured={!!geminiApiKey}
              onAddGames={handleAddMultipleGames}
            />}
          />
          <Route path="/apikeys" element={
             apiKeys ? ( 
              <ApiKeysView
                apiKeys={apiKeys as ApiKeyEntry[]} 
                onUpdateApiKey={handleUpdateApiKey}
              />
            ) : (
              <div className="p-8 text-center text-neutral-500">Loading API Key settings...</div>
            )
          } />
          <Route path="*" element={<Navigate to="/games" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;