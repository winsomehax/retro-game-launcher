
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

  const handleAddGame = useCallback((game: Game) => setGames(prev => [...prev, game]), []);
  const handleUpdateGame = useCallback((updatedGame: Game) => setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g)), []);
  const handleDeleteGame = useCallback((gameId: string) => setGames(prev => prev.filter(g => g.id !== gameId)), []);

  const handleAddPlatform = useCallback((platformData: Omit<Platform, 'emulators'>) => {
    const newPlatform: Platform = { ...platformData, id: platformData.id || crypto.randomUUID(), emulators: [] };
    setPlatforms(prev => [...prev, newPlatform]);
  }, []);

  const handleUpdatePlatform = useCallback((updatedPlatformData: Omit<Platform, 'emulators'>) => {
    setPlatforms(prev => prev.map(p => 
      p.id === updatedPlatformData.id ? { ...p, name: updatedPlatformData.name, iconUrl: updatedPlatformData.iconUrl } : p
    ));
  }, []);

  const handleDeletePlatform = useCallback((platformId: string) => {
    setPlatforms(prev => prev.filter(p => p.id !== platformId));
    setGames(prev => prev.filter(g => g.platformId !== platformId));
  }, []);

  const handleAddEmulator = useCallback((platformId: string, emulatorConfig: EmulatorConfig) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, emulators: [...p.emulators, {...emulatorConfig, id: emulatorConfig.id || crypto.randomUUID()}] } : p
    ));
  }, []);

  const handleUpdateEmulator = useCallback((platformId: string, updatedEmulatorConfig: EmulatorConfig) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, emulators: p.emulators.map(e => e.id === updatedEmulatorConfig.id ? updatedEmulatorConfig : e) } : p
    ));
  }, []);

  const handleDeleteEmulator = useCallback((platformId: string, emulatorId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, emulators: p.emulators.filter(e => e.id !== emulatorId) } : p
    ));
  }, []);

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
          <Route path="/scan" element={<ScanView />} />
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
