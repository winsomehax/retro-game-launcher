import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { Platform, Game } from '../types'; // Game type will be used for creating Game objects
import { DEFAULT_ROM_FOLDER } from '../constants';

interface ScanRomsViewProps {
  platforms: Platform[];
  onAddGames: (games: Game[], platformId: string) => void; // To add multiple games to the main state
  // isLoading: boolean; // Might be useful later for showing loading state during API calls
}

export const ScanRomsView: React.FC<ScanRomsViewProps> = ({ platforms, onAddGames }) => {
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [romsPath, setRomsPath] = useState<string>(DEFAULT_ROM_FOLDER);
  const [scannedRoms, setScannedRoms] = useState<string[]>([]);
  const [selectedRoms, setSelectedRoms] = useState<string[]>([]);
  // const [enrichedRomsData, setEnrichedRomsData] = useState<any[]>([]); // Placeholder for future AI enrichment
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Effect to clear selections and messages when platform changes
  useEffect(() => {
    setScannedRoms([]);
    setSelectedRoms([]);
    setScanError(null);
    setImportMessage(null);
  }, [selectedPlatformId]);

  const handleScan = async () => {
    if (!selectedPlatformId) {
      setScanError('Please select a platform.');
      return;
    }
    if (!romsPath.trim()) {
      setScanError('Please enter a ROMs path.');
      return;
    }

    setIsLoading(true);
    setScanError(null);
    setScannedRoms([]);
    setSelectedRoms([]);
    setImportMessage(null);

    try {
      const response = await fetch('/api/scan-roms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId: selectedPlatformId, folderPath: romsPath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: string[] = await response.json();
      setScannedRoms(data);
      if (data.length === 0) {
        setScanError('No ROM files found in the specified directory. Check the path and ignored extensions.');
      }
    } catch (error: any) {
      console.error('Failed to scan ROMs:', error);
      setScanError(error.message || 'An unexpected error occurred during scan.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRomSelection = (romName: string) => {
    setSelectedRoms(prevSelected =>
      prevSelected.includes(romName)
        ? prevSelected.filter(name => name !== romName)
        : [...prevSelected, romName]
    );
  };

  const toggleSelectAllRoms = () => {
    if (selectedRoms.length === scannedRoms.length) {
      setSelectedRoms([]);
    } else {
      setSelectedRoms([...scannedRoms]);
    }
  };

  const handleEnrichRoms = async () => {
    // Placeholder for future AI enrichment functionality
    // This function would likely take `selectedRoms` or all `scannedRoms`
    // and call an endpoint like `/api/enrich-roms`
    console.log('Enrich with AI button clicked. Selected ROMs:', selectedRoms);
    setImportMessage('AI Enrichment feature is not yet implemented.');
    // Example:
    // setIsLoading(true);
    // try {
    //   const response = await fetch('/api/enrich-roms', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ romNames: selectedRoms, platformId: selectedPlatformId }),
    //   });
    //   // ... process response and update enrichedRomsData state ...
    // } catch (error) {
    //   console.error('Failed to enrich ROMs:', error);
    //   setImportMessage('Error during AI enrichment.');
    // } finally {
    //   setIsLoading(false);
    // }
  };

  const handleImportRoms = () => {
    if (selectedRoms.length === 0) {
      setImportMessage('No ROMs selected for import.');
      return;
    }
    if (!selectedPlatformId) {
      setImportMessage('No platform selected. This should not happen if ROMs are selected.');
      return;
    }

    const gamesToImport: Game[] = selectedRoms.map((romName, index) => ({
      // Generate a unique ID - simple example, consider more robust generation
      id: `${selectedPlatformId}-${romName.replace(/\s+/g, '-')}-${Date.now() + index}`,
      title: romName, // Cleaned filename is used as title initially
      platformId: selectedPlatformId,
      romPath: `${romsPath}/${romName}`, // This needs the original extension. The current backend only returns names.
                                        // This is a simplification. For a real app, the backend should return full filenames or relative paths.
                                        // For now, we'll assume the user needs to manually verify/add extensions or the backend is updated.
      coverImageUrl: '', // To be fetched later or manually added
      description: '',   // To be enriched or manually added
      genre: '',         // To be enriched or manually added
      releaseDate: '',   // To be enriched or manually added
    }));

    try {
      onAddGames(gamesToImport, selectedPlatformId);
      setImportMessage(`${gamesToImport.length} game(s) successfully prepared for import. Check your games list.`);
      // Clear selections after import
      setSelectedRoms([]);
      // Optionally clear scannedRoms as well or keep them for further actions
      // setScannedRoms([]);
    } catch (error) {
      console.error('Error importing games:', error);
      setImportMessage('An error occurred while importing games.');
    }
  };

  const currentPlatformName = platforms.find(p => p.id.toString() === selectedPlatformId)?.name || "Selected Platform";

  const platformOptions = platforms.map(platform => ({
    value: platform.id.toString(),
    label: platform.name,
  }));

  return (
    <div className="p-4 md:p-6 bg-neutral-900 text-white min-h-screen">
      <header className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-primary">Scan ROMs</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Select a platform, specify the folder where its ROMs are, and import them into your library.
        </p>
      </header>

      {/* --- Scan Configuration Section --- */}
      <section className="space-y-4 md:space-y-6 max-w-3xl mx-auto bg-neutral-800 p-6 md:p-8 rounded-lg shadow-xl mb-8">
        {platforms.length === 0 ? (
          <p className="text-center text-yellow-400 bg-yellow-900/30 p-3 rounded-md">
            You need to configure a platform first. Go to 'Platforms' to add one.
          </p>
        ) : (
          <Select
            label="1. Select Platform"
            value={selectedPlatformId} // selectedPlatformId is already initialized to ''
            onChange={(e) => setSelectedPlatformId(e.target.value)}
            options={platformOptions}
            placeholder="-- Select a Platform --"
            className="w-full"
            labelClassName="text-neutral-300 text-lg"
            selectClassName="bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
            disabled={isLoading}
          />
        )}

        <Input
          label="2. ROMs Folder Path"
          type="text"
          value={romsPath}
          onChange={(e) => setRomsPath(e.target.value)}
          placeholder="e.g., /Users/username/roms/snes or C:\\ROMs\\SNES"
          className="w-full"
          labelClassName="text-neutral-300 text-lg"
          inputClassName="bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
          helpText={`Default: ${DEFAULT_ROM_FOLDER}. Provide the full local path to the directory containing ROM files for ${currentPlatformName}.`}
          disabled={isLoading || !selectedPlatformId}
        />

        <Button
          onClick={handleScan}
          disabled={!selectedPlatformId || isLoading || platforms.length === 0}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              {/* Add a spinner icon here if available */}
              <span>Scanning...</span>
            </>
          ) : (
            <span>3. Begin Scan</span>
          )}
        </Button>
        {scanError && <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md text-center">{scanError}</p>}
      </section>

      {/* --- Scanned ROMs Display and Actions Section --- */}
      {scannedRoms.length > 0 && (
        <section className="space-y-4 md:space-y-6 max-w-3xl mx-auto bg-neutral-800 p-6 md:p-8 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-primary border-b border-neutral-700 pb-3 mb-4">
            Found {scannedRoms.length} Potential ROMs for {currentPlatformName}
          </h2>

          <div className="max-h-96 overflow-y-auto pr-2 space-y-2 bg-neutral-850 p-4 rounded-md">
            <div className="flex items-center mb-2 border-b border-neutral-700 pb-2">
              <label htmlFor="select-all-roms" className="flex items-center space-x-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  id="select-all-roms"
                  checked={selectedRoms.length === scannedRoms.length && scannedRoms.length > 0}
                  onChange={toggleSelectAllRoms}
                  className="form-checkbox h-5 w-5 text-primary bg-neutral-700 border-neutral-600 focus:ring-primary-dark"
                />
                <span>Select All ({selectedRoms.length}/{scannedRoms.length})</span>
              </label>
            </div>
            {scannedRoms.map((romName) => (
              <div key={romName} className="flex items-center p-2 hover:bg-neutral-700 rounded-md transition-colors duration-150">
                <label htmlFor={`rom-${romName.replace(/\s+/g, '-')}`} className="flex items-center space-x-2 cursor-pointer text-neutral-200 flex-grow">
                  <input
                    type="checkbox"
                    id={`rom-${romName.replace(/\s+/g, '-')}`} // Create unique ID
                    checked={selectedRoms.includes(romName)}
                    onChange={() => toggleRomSelection(romName)}
                    className="form-checkbox h-5 w-5 text-primary bg-neutral-700 border-neutral-600 focus:ring-primary-dark"
                  />
                  <span>{romName}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-neutral-700">
            <Button
              onClick={handleEnrichRoms}
              disabled={isLoading || scannedRoms.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
              title="Use AI to fetch descriptions, genres, etc. (Not implemented)"
            >
              Enrich Selected ({selectedRoms.length})
            </Button>
            <Button
              onClick={handleImportRoms}
              disabled={isLoading || selectedRoms.length === 0}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Import Selected ({selectedRoms.length}) to Library
            </Button>
          </div>
          {importMessage && <p className={`text-sm p-3 rounded-md text-center ${importMessage.includes("Error") || importMessage.includes("Failed") ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30'}`}>{importMessage}</p>}
        </section>
      )}
    </div>
  );
};
