import React, { useState, useRef, createRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Platform, EmulatorConfig, Game } from '../types'; // Added Game
import { Button } from '../components/Button';
import { PlusIcon, EditIcon, TrashIcon, ChevronRightIcon, CogIcon, SearchIcon as ScanIcon } from '../components/Icons'; // Added ScanIcon (using SearchIcon as placeholder)
import { PlatformForm } from '../components/PlatformForm';
import { EmulatorConfigForm } from '../components/EmulatorConfigForm';

interface PlatformsViewProps {
  platforms: Platform[]; // Platform type already updated in types.ts
  games: Game[]; // Added games prop
  onAddPlatform: (platformData: Platform) => void; // Expect full Platform object
  onUpdatePlatform: (platformData: Platform) => void; // Expect full Platform object
  onDeletePlatform: (platformId: number) => void; // ID is now number
  onAddEmulator: (platformId: number, emulatorConfig: EmulatorConfig) => void; // ID is now number
  onUpdateEmulator: (platformId: number, emulatorConfig: EmulatorConfig) => void; // ID is now number
  onDeleteEmulator: (platformId: number, emulatorId: string) => void; // ID is now number
}

export const PlatformsView: React.FC<PlatformsViewProps> = ({
  platforms,
  games, // Added games prop
  onAddPlatform,
  onUpdatePlatform,
  onDeletePlatform,
  onAddEmulator,
  onUpdateEmulator,
  onDeleteEmulator,
}) => {
  const [isPlatformFormOpen, setIsPlatformFormOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null); // Use full Platform type
  
  const [isEmulatorFormOpen, setIsEmulatorFormOpen] = useState(false);
  const [editingEmulator, setEditingEmulator] = useState<EmulatorConfig | null>(null);
  const [selectedPlatformForEmulator, setSelectedPlatformForEmulator] = useState<Platform | null>(null);

  const [activePlatformId, setActivePlatformId] = useState<number | null>(platforms.length > 0 ? platforms[0].id : null); // ID is now number
  const navigate = useNavigate();
  
  const platformItemRefs = useRef(platforms.map(() => createRef<HTMLButtonElement>()));
  const platformListRef = useRef<HTMLUListElement>(null);

  // Update refs when platforms array changes
  useEffect(() => {
    platformItemRefs.current = platforms.map((_, i) => platformItemRefs.current[i] || createRef<HTMLButtonElement>());
  }, [platforms]);

  const handlePlatformKeyDown = useCallback((event: React.KeyboardEvent<HTMLUListElement>, platformId: number) => { // ID is now number
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = platforms.findIndex(p => p.id === platformId);
      let nextIndex;
      if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % platforms.length;
      } else {
        nextIndex = (currentIndex - 1 + platforms.length) % platforms.length;
      }
      platformItemRefs.current[nextIndex]?.current?.focus();
      // setActivePlatformId(platforms[nextIndex].id); // Uncomment if arrow keys should also select
    }
  }, [platforms]);


  const handleAddPlatform = () => {
    setEditingPlatform(null); // Clear any platform being edited
    setIsPlatformFormOpen(true);
  };

  const handleEditPlatform = (platform: Platform) => { // Expect full Platform object
    setEditingPlatform(platform);
    setIsPlatformFormOpen(true);
  };

  const handlePlatformSubmit = (platformData: Platform) => { // Expect full Platform object
    // platformData.id is now a number from TheGamesDB or from existing edited platform
    if (editingPlatform) {
      onUpdatePlatform(platformData);
    } else {
      // For new platforms, platformData is the full object from TGDB, including its numeric ID
      onAddPlatform(platformData);
      if (!activePlatformId || platforms.length === 0) { 
         setActivePlatformId(platformData.id); // Use the numeric ID
         // Focus the newly added platform after a short delay for DOM update
         setTimeout(() => {
            const newIndex = platforms.findIndex(p => p.id === platformData.id);
            if (newIndex !== -1) platformItemRefs.current[newIndex]?.current?.focus();
         }, 100);
      }
    }
    setIsPlatformFormOpen(false);
    setEditingPlatform(null); // Clear editing state
  };

  const handleAddEmulator = (platform: Platform) => {
    setSelectedPlatformForEmulator(platform);
    setEditingEmulator(null);
    setIsEmulatorFormOpen(true);
  };

  const handleEditEmulator = (platform: Platform, emulator: EmulatorConfig) => {
    setSelectedPlatformForEmulator(platform);
    setEditingEmulator(emulator);
    setIsEmulatorFormOpen(true);
  };

  const handleEmulatorSubmit = (emulatorConfig: EmulatorConfig) => {
    if (selectedPlatformForEmulator) {
      if (editingEmulator) {
        onUpdateEmulator(selectedPlatformForEmulator.id, emulatorConfig);
      } else {
        onAddEmulator(selectedPlatformForEmulator.id, emulatorConfig);
      }
    }
    setIsEmulatorFormOpen(false);
  };
  
  const currentSelectedPlatform = platforms.find(p => p.id === activePlatformId);

  // Auto-select first platform if activePlatformId becomes invalid (e.g. platform deleted)
   useEffect(() => {
    if (!activePlatformId && platforms.length > 0) {
      setActivePlatformId(platforms[0].id);
    } else if (activePlatformId && !platforms.find(p => p.id === activePlatformId) && platforms.length > 0) {
      setActivePlatformId(platforms[0].id);
    } else if (platforms.length === 0) {
      setActivePlatformId(null);
    }
  }, [platforms, activePlatformId]);


  return (
    <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-display font-bold text-neutral-100">Platforms & Emulators</h2>
          <p className="text-neutral-400 text-sm">Configure your gaming platforms and associated emulators.</p>
        </div>
        <Button onClick={handleAddPlatform} leftIcon={<PlusIcon />} variant="primary" size="lg">
          Add Platform
        </Button>
      </header>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        <div className="md:col-span-1 bg-neutral-800 p-4 rounded-lg shadow-lg flex flex-col overflow-y-auto">
          <h3 className="text-lg font-semibold text-neutral-200 mb-3 px-2" id="platforms-list-label">Available Platforms</h3>
          {platforms.length > 0 ? (
            <ul 
              ref={platformListRef}
              className="space-y-2" 
              role="listbox" // or 'menu' depending on exact interaction
              aria-labelledby="platforms-list-label"
              onKeyDown={(e) => activePlatformId && handlePlatformKeyDown(e, activePlatformId)}
            >
              {platforms.map((platform, index) => (
                <li key={platform.id} role="option" aria-selected={activePlatformId === platform.id}>
                  <button 
                    ref={platformItemRefs.current[index]}
                    onClick={() => setActivePlatformId(platform.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-md transition-all duration-150 ease-in-out text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800
                                ${activePlatformId === platform.id ? 'bg-primary text-white shadow-md' : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'}`}
                  >
                    <div className="flex items-center space-x-3">
                        {(platform.userIconUrl || platform.icon) && <img src={platform.userIconUrl || platform.icon} alt={`${platform.name} icon`} className="w-6 h-6 rounded-sm object-cover"/>}
                        {!(platform.userIconUrl || platform.icon) && <div aria-hidden="true" className="w-6 h-6 rounded-sm bg-neutral-500 flex items-center justify-center text-xs text-neutral-300">{platform.name.substring(0,1).toUpperCase()}</div>}
                        <span>{platform.name}</span>
                    </div>
                    <ChevronRightIcon className={`w-5 h-5 ${activePlatformId === platform.id ? 'text-white' : 'text-neutral-400'}`} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-500 text-center py-4">No platforms configured. Add one to get started!</p>
          )}
        </div>

        <div className="md:col-span-2 bg-neutral-800 p-6 rounded-lg shadow-lg flex flex-col overflow-y-auto" aria-live="polite" aria-atomic="true">
          {currentSelectedPlatform ? (
            <>
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-700">
                <div className="flex items-start space-x-4">
                  {(currentSelectedPlatform.userIconUrl || currentSelectedPlatform.icon) && (
                    <img
                      src={currentSelectedPlatform.userIconUrl || currentSelectedPlatform.icon}
                      alt={`${currentSelectedPlatform.name} icon`}
                      className="w-24 h-24 rounded-lg object-contain bg-neutral-700 p-1"
                    />
                  )}
                  <div>
                    <h3 className="text-3xl font-display font-bold text-neutral-100">{currentSelectedPlatform.name}</h3>
                    <p className="text-sm text-neutral-400 mt-1">Manage emulators and view details for this platform.</p>
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0"> {/* Removed diagnostic styling */}
                  <Button variant="secondary" size="sm" onClick={() => handleEditPlatform(currentSelectedPlatform)} aria-label={`Edit ${currentSelectedPlatform.name}`}> {/* Changed to secondary */}
                      <EditIcon className="text-neutral-400 hover:text-primary-light"/> Edit {/* Added text for diagnostics */}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { {/* Changed to secondary */}
                    const platformToDelete = currentSelectedPlatform;
                    if (!platformToDelete) return;

                    const linkedGames = games.filter(game => String(game.platformId) === String(platformToDelete.id));
                    const linkedEmulatorsCount = platformToDelete.emulators.length;

                    let confirmMessage = `Are you sure you want to delete the platform "${platformToDelete.name}"?`;
                    const details = [];
                    if (linkedGames.length > 0) {
                      details.push(`${linkedGames.length} game(s) will also be deleted: ${linkedGames.slice(0, 3).map(g => `"${g.title}"`).join(', ')}${linkedGames.length > 3 ? ', and more...' : ''}`);
                    }
                    if (linkedEmulatorsCount > 0) {
                      details.push(`${linkedEmulatorsCount} configured emulator(s) for this platform will also be removed.`);
                    }

                    if (details.length > 0) {
                      confirmMessage += `\n\nWARNING:\n- ${details.join('\n- ')}\n\nIf you proceed, the platform, its emulators, and all associated game entries will be permanently deleted. This action cannot be undone.`;
                    } else {
                      confirmMessage += ` This action cannot be undone.`
                    }

                    if (confirm(confirmMessage)) {
                        const platformIdToDelete = currentSelectedPlatform.id;
                        const nextIndexToFocus = platforms.findIndex(p => p.id === platformIdToDelete);
                        
                        onDeletePlatform(platformIdToDelete);

                        // Focus logic after deletion
                        setTimeout(() => {
                            const remainingPlatforms = platforms.filter(p => p.id !== platformIdToDelete);
                            if (remainingPlatforms.length > 0) {
                                const focusIndex = Math.max(0, Math.min(nextIndexToFocus, remainingPlatforms.length - 1));
                                setActivePlatformId(remainingPlatforms[focusIndex].id);
                                platformItemRefs.current[focusIndex]?.current?.focus();
                            } else {
                                setActivePlatformId(null);
                            }
                        }, 100);
                    }
                  }} aria-label={`Delete ${currentSelectedPlatform.name}`}>
                      <TrashIcon className="text-neutral-400 hover:text-red-500"/> Delete {/* Added text for diagnostics */}
                  </Button>
                </div>
              </div>

              {/* Platform Details Section */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {currentSelectedPlatform.overview && (
                  <div className="md:col-span-2 bg-neutral-700/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-neutral-200 mb-1">Overview</h5>
                    <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{currentSelectedPlatform.overview}</p>
                  </div>
                )}

                <div>
                  {currentSelectedPlatform.manufacturer && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Manufacturer:</strong> <span className="text-neutral-400">{currentSelectedPlatform.manufacturer}</span></p>
                  )}
                  {currentSelectedPlatform.developer && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Developer:</strong> <span className="text-neutral-400">{currentSelectedPlatform.developer}</span></p>
                  )}
                  {currentSelectedPlatform.console && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Type:</strong> <span className="text-neutral-400">{currentSelectedPlatform.console}</span></p>
                  )}
                  {currentSelectedPlatform.media && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Media:</strong> <span className="text-neutral-400">{currentSelectedPlatform.media}</span></p>
                  )}
                </div>

                <div>
                  {currentSelectedPlatform.cpu && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">CPU:</strong> <span className="text-neutral-400">{currentSelectedPlatform.cpu}</span></p>
                  )}
                  {currentSelectedPlatform.memory && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Memory:</strong> <span className="text-neutral-400">{currentSelectedPlatform.memory}</span></p>
                  )}
                  {currentSelectedPlatform.graphics && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Graphics:</strong> <span className="text-neutral-400">{currentSelectedPlatform.graphics}</span></p>
                  )}
                  {currentSelectedPlatform.sound && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Sound:</strong> <span className="text-neutral-400">{currentSelectedPlatform.sound}</span></p>
                  )}
                  {currentSelectedPlatform.maxcontrollers && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Max Controllers:</strong> <span className="text-neutral-400">{currentSelectedPlatform.maxcontrollers}</span></p>
                  )}
                   {currentSelectedPlatform.display && (
                    <p className="mb-1.5"><strong className="font-medium text-neutral-300">Display:</strong> <span className="text-neutral-400">{currentSelectedPlatform.display}</span></p>
                  )}
                </div>

                {currentSelectedPlatform.youtube && (
                  <div className="md:col-span-2">
                    <h5 className="font-semibold text-neutral-200 mb-1">Gameplay Video</h5>
                    {/* Basic link for now, could be replaced with an embed */}
                    <a
                      href={currentSelectedPlatform.youtube.startsWith('http') ? currentSelectedPlatform.youtube : `https://www.youtube.com/watch?v=${currentSelectedPlatform.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-light underline break-all"
                    >
                      {currentSelectedPlatform.youtube}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-4 pt-4 border-t border-neutral-700">
                <h4 className="text-lg font-semibold text-neutral-200">Configured Emulators</h4>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/scan', { state: { platformId: currentSelectedPlatform.id, platformName: currentSelectedPlatform.name } })}
                    leftIcon={<ScanIcon />}
                    size="sm"
                    variant="outline"
                    aria-label={`Scan ROMs for ${currentSelectedPlatform.name}`}
                  >
                    Scan ROMs
                  </Button>
                  <Button onClick={() => handleAddEmulator(currentSelectedPlatform)} leftIcon={<PlusIcon />} size="sm" variant="secondary">
                    Add Emulator
                  </Button>
                </div>
              </div>
              {currentSelectedPlatform.emulators.length > 0 ? (
                <ul className="space-y-3">
                  {currentSelectedPlatform.emulators.map(emulator => (
                    <li key={emulator.id} className="bg-neutral-700 p-4 rounded-md shadow flex justify-between items-center hover:bg-neutral-600/70 transition-colors">
                      <div>
                        <p className="font-medium text-neutral-100">{emulator.name}</p>
                        <p className="text-xs text-neutral-400 truncate max-w-xs" title={emulator.executablePath}>Path: {emulator.executablePath}</p>
                        <p className="text-xs text-neutral-400 truncate max-w-xs" title={emulator.args}>Args: {emulator.args || 'None'}</p>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleEditEmulator(currentSelectedPlatform, emulator)} aria-label={`Edit ${emulator.name}`}>
                          <EditIcon className="text-neutral-400 hover:text-primary-light"/>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                            if(confirm(`Are you sure you want to delete the emulator "${emulator.name}"?`)) {
                                onDeleteEmulator(currentSelectedPlatform.id, emulator.id);
                            }
                        }} aria-label={`Delete ${emulator.name}`}>
                          <TrashIcon className="text-neutral-400 hover:text-red-500"/>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-neutral-500 text-center py-4">No emulators configured for this platform yet.</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600">
              <CogIcon className="w-20 h-20 mb-4"/>
              <p className="text-lg">Select a platform from the list to view its details and emulators.</p>
              <p className="text-sm">If no platforms exist, add one using the button above.</p>
            </div>
          )}
        </div>
      </div>

      {isPlatformFormOpen && (
        <PlatformForm
          isOpen={isPlatformFormOpen}
          onClose={() => setIsPlatformFormOpen(false)}
          onSubmit={handlePlatformSubmit}
          initialPlatform={editingPlatform}
        />
      )}

      {isEmulatorFormOpen && selectedPlatformForEmulator && (
        <EmulatorConfigForm
          isOpen={isEmulatorFormOpen}
          onClose={() => setIsEmulatorFormOpen(false)}
          onSubmit={handleEmulatorSubmit}
          initialConfig={editingEmulator}
          platformName={selectedPlatformForEmulator.name}
        />
      )}
    </div>
  );
};
