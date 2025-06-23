
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

const LOCAL_STORAGE_API_KEYS_KEY = 'retroGameLauncherApiKeys';

// Helper function to load initial API keys
const loadInitialApiKeys = async (): Promise<[ApiKeyEntry, ApiKeyEntry]> => {
  try {
    const storedKeysString = localStorage.getItem(LOCAL_STORAGE_API_KEYS_KEY);
    if (storedKeysString) {
      const parsedKeys = JSON.parse(storedKeysString) as ApiKeyEntry[];
      const tgdbKey = parsedKeys.find(k => k.id === THEGAMESDB_API_KEY_ID);
      const geminiKey = parsedKeys.find(k => k.id === GEMINI_API_KEY_ID);
      if (tgdbKey && geminiKey) {
        // Ensure the structure matches the tuple, even if loaded from a generic array
        return [
          { ...createDefaultApiKeyEntry(THEGAMESDB_API_KEY_ID, SERVICE_NAME_THEGAMESDB), apiKey: tgdbKey.apiKey },
          { ...createDefaultApiKeyEntry(GEMINI_API_KEY_ID, SERVICE_NAME_GEMINI), apiKey: geminiKey.apiKey }
        ];
      }
    }
  } catch (error) {
    console.error("Error parsing API keys from localStorage:", error);
    // Proceed to load from file/defaults
  }

  try {
    const response = await fetch('/data/keys.json');
    if (!response.ok) {
        // If keys.json is not found (e.g., 404), it's not a critical error, just proceed to defaults.
        if (response.status === 404) {
            console.log("/data/keys.json not found, proceeding with defaults.");
        } else {
            throw new Error(`HTTP error! status: ${response.status} for keys.json`);
        }
    } else {
        const loadedKeysFromFile = await response.json() as ApiKeyEntry[];
        
        const tgdbKeyFromFile = loadedKeysFromFile.find(k => k.id === THEGAMESDB_API_KEY_ID);
        const geminiKeyFromFile = loadedKeysFromFile.find(k => k.id === GEMINI_API_KEY_ID);

        const keysToStore: [ApiKeyEntry, ApiKeyEntry] = [
        createDefaultApiKeyEntry(THEGAMESDB_API_KEY_ID, SERVICE_NAME_THEGAMESDB),
        createDefaultApiKeyEntry(GEMINI_API_KEY_ID, SERVICE_NAME_GEMINI)
        ];
        if (tgdbKeyFromFile) keysToStore[0].apiKey = tgdbKeyFromFile.apiKey;
        if (geminiKeyFromFile) keysToStore[1].apiKey = geminiKeyFromFile.apiKey;
        
        localStorage.setItem(LOCAL_STORAGE_API_KEYS_KEY, JSON.stringify(keysToStore));
        return keysToStore;
    }
  } catch (error) {
    console.error("Could not load API keys from data/keys.json, using defaults:", error);
  }

  // Default fallback if all else fails
  const defaultKeys: [ApiKeyEntry, ApiKeyEntry] = [
    createDefaultApiKeyEntry(THEGAMESDB_API_KEY_ID, SERVICE_NAME_THEGAMESDB),
    createDefaultApiKeyEntry(GEMINI_API_KEY_ID, SERVICE_NAME_GEMINI),
  ];
  // Save defaults to localStorage if they are being used for the first time
  if (!localStorage.getItem(LOCAL_STORAGE_API_KEYS_KEY)) {
    localStorage.setItem(LOCAL_STORAGE_API_KEYS_KEY, JSON.stringify(defaultKeys));
  }
  return defaultKeys;
};


const AppContent: React.FC = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [apiKeys, setApiKeys] = useState<[ApiKeyEntry, ApiKeyEntry] | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // --- Persistence Functions ---
  const savePlatforms = useCallback(async (platformsToSave: Platform[]) => {
    try {
      // This endpoint needs to be created on the server to write to `public/data/platforms.json`
      const response = await fetch('/api/data/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformsToSave, null, 2)
      });
      if (!response.ok) {
        throw new Error(`Failed to save platforms: ${response.statusText}`);
      }
      console.log("Platforms saved successfully.");
    } catch (error) {
      console.error("Error saving platforms:", error);
      // TODO: Add user-facing error notification
    }
  }, []);

  const saveGames = useCallback(async (gamesToSave: Game[]) => {
    try {
      // This endpoint needs to be created on the server to write to `public/data/games.json`
      const response = await fetch('/api/data/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gamesToSave, null, 2)
      });
      if (!response.ok) {
        throw new Error(`Failed to save games: ${response.statusText}`);
      }
      console.log("Games saved successfully.");
    } catch (error) {
      console.error("Error saving games:", error);
      // TODO: Add user-facing error notification
    }
  }, []);

  useEffect(() => {
    fetch('/data/platforms.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for platforms.json`);
        return response.json();
      })
      .then((data: Platform[]) => setPlatforms(data))
      .catch(error => console.error("Could not load platforms:", error));

    fetch('/data/games.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for games.json`);
        return response.json();
      })
      .then((data: Game[]) => setGames(data))
      .catch(error => console.error("Could not load games:", error));

    loadInitialApiKeys().then(keys => {
      setApiKeys(keys);
    });
  }, []);

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

  const handleAddGame = useCallback((game: Game) => {
    setGames(prev => {
      const newGames = [...prev, game];
      saveGames(newGames);
      return newGames;
    });
  }, [saveGames]);

  const handleUpdateGame = useCallback((updatedGame: Game) => {
    setGames(prev => {
      const newGames = prev.map(g => g.id === updatedGame.id ? updatedGame : g);
      saveGames(newGames);
      return newGames;
    });
  }, [saveGames]);

  const handleDeleteGame = useCallback((gameId: string) => {
    setGames(prev => {
      const newGames = prev.filter(g => g.id !== gameId);
      saveGames(newGames);
      return newGames;
    });
  }, [saveGames]);

  // New function for adding multiple games
  const handleAddMultipleGames = useCallback((newGames: Game[], platformId: string) => {
    setGames(prevGames => {
      const existingRomPaths = new Set(prevGames.filter(g => g.platformId === platformId).map(g => g.romPath));
      const gamesToAdd = newGames.filter(g => !existingRomPaths.has(g.romPath));
      if (gamesToAdd.length < newGames.length) {
        const skippedCount = newGames.length - gamesToAdd.length;
        console.log(`${skippedCount} game(s) were skipped as they already exist in the library for this platform.`);
      }
      if (gamesToAdd.length > 0) {
        const newGamesState = [...prevGames, ...gamesToAdd];
        saveGames(newGamesState);
        return newGamesState;
      }
      return prevGames; // No changes, don't save or re-render
    });
  }, [saveGames]);

  // Adjusted handleAddPlatform to prevent duplicates and ensure correct typing
  const handleAddPlatform = useCallback((platformToAdd: { id: string; name: string; alias?: string }) => {
    setPlatforms(prevPlatforms => {
      // Check if platform with same id or name (case-insensitive) already exists
      const existingPlatform = prevPlatforms.find(
        p => p.id === platformToAdd.id || p.name.toLowerCase() === platformToAdd.name.toLowerCase()
      );
      if (existingPlatform) {
        console.warn(`Platform with ID ${platformToAdd.id} or name "${platformToAdd.name}" already exists. Not adding duplicate.`);
        return prevPlatforms;
      }
      const newPlatform: Platform = {
        id: platformToAdd.id, // ID from TGDB, converted to string
        name: platformToAdd.name,
        alias: platformToAdd.alias || '', // Ensure alias is at least an empty string
        emulators: [],
        iconUrl: '', // Default iconUrl
      };
      console.log("Adding new platform to state:", newPlatform);
      const newPlatforms = [...prevPlatforms, newPlatform];
      savePlatforms(newPlatforms);
      return newPlatforms;
    });
  }, [savePlatforms]);

  const handleUpdatePlatform = useCallback((updatedPlatformData: Omit<Platform, 'emulators'>) => {
    setPlatforms(prev => {
      const newPlatforms = prev.map(p => 
        p.id === updatedPlatformData.id ? { ...p, name: updatedPlatformData.name, iconUrl: updatedPlatformData.iconUrl, alias: updatedPlatformData.alias } : p
      );
      savePlatforms(newPlatforms);
      return newPlatforms;
    });
  }, [savePlatforms]);

  const handleDeletePlatform = useCallback((platformId: string) => {
    setPlatforms(prev => {
      const newPlatforms = prev.filter(p => p.id !== platformId);
      savePlatforms(newPlatforms);
      return newPlatforms;
    });
    setGames(prev => {
      const newGames = prev.filter(g => g.platformId !== platformId);
      saveGames(newGames);
      return newGames;
    });
  }, [savePlatforms, saveGames]);

  const handleAddEmulator = useCallback((platformId: string, emulatorConfig: EmulatorConfig) => {
    setPlatforms(prev => {
      const newPlatforms = prev.map(p => 
        p.id === platformId ? { ...p, emulators: [...p.emulators, {...emulatorConfig, id: emulatorConfig.id || crypto.randomUUID()}] } : p
      );
      savePlatforms(newPlatforms);
      return newPlatforms;
    });
  }, [savePlatforms]);

  const handleUpdateEmulator = useCallback((platformId: string, updatedEmulatorConfig: EmulatorConfig) => {
    setPlatforms(prev => {
      const newPlatforms = prev.map(p => 
        p.id === platformId ? { ...p, emulators: p.emulators.map(e => e.id === updatedEmulatorConfig.id ? updatedEmulatorConfig : e) } : p
      );
      savePlatforms(newPlatforms);
      return newPlatforms;
    });
  }, [savePlatforms]);

  const handleDeleteEmulator = useCallback((platformId: string, emulatorId: string) => {
    setPlatforms(prev => {
      const newPlatforms = prev.map(p => 
        p.id === platformId ? { ...p, emulators: p.emulators.filter(e => e.id !== emulatorId) } : p
      );
      savePlatforms(newPlatforms);
      return newPlatforms;
    });
  }, [savePlatforms]);

  const handleUpdateApiKey = useCallback((updatedApiKey: ApiKeyEntry) => {
    setApiKeys(prevKeys => {
      if (!prevKeys) return null; // Should ideally not be null if update is called
      const newKeysTuple: [ApiKeyEntry, ApiKeyEntry] = [{...prevKeys[0]}, {...prevKeys[1]}];
      if (newKeysTuple[0].id === updatedApiKey.id) {
        newKeysTuple[0] = { ...updatedApiKey };
      } else if (newKeysTuple[1].id === updatedApiKey.id) {
        newKeysTuple[1] = { ...updatedApiKey };
      }
      localStorage.setItem(LOCAL_STORAGE_API_KEYS_KEY, JSON.stringify(newKeysTuple));
      return newKeysTuple;
    });
  }, []);

  const theGamesDbApiKey = apiKeys ? (apiKeys.find(k => k.id === THEGAMESDB_API_KEY_ID)?.apiKey || "") : "";
  const geminiApiKey = apiKeys ? (apiKeys.find(k => k.id === GEMINI_API_KEY_ID)?.apiKey || "") : "";


  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900">
      <Navbar currentView={currentView} onNavigate={handleNavigation} />
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
                apiKeys={apiKeys} 
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
