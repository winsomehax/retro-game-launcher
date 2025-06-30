import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { Platform, Game } from '../types';
import { DEFAULT_ROM_FOLDER } from '../constants';

interface ScannedRomFile {
  name: string; // Filename without extension
  filename: string; // Full filename with extension
}

interface EnrichedRomFromApi {
  original_name: string;
  suggested_title: string;
}

// Structure for holding enriched data and user choices
interface EnrichedGameSuggestion {
  original_name: string; // From ScannedRomFile.name
  suggested_title: string; // From AI
  filename: string; // From ScannedRomFile.filename, for unique key and import
  user_title: string; // Editable, defaults to suggested_title or original_name
  is_selected_for_import: boolean;
}

interface ScanRomsViewProps {
  platforms: Platform[];
  onAddGames: (games: Game[]) => void;
}

export const ScanRomsView: React.FC<ScanRomsViewProps> = ({ platforms, onAddGames }) => {
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [romsPath, setRomsPath] = useState<string>(DEFAULT_ROM_FOLDER);

  // Stage 1: Raw scanned files
  const [scannedRoms, setScannedRoms] = useState<ScannedRomFile[]>([]);
  // Stage 2: Enriched suggestions (this becomes the main list for display after enrichment)
  const [enrichedGameSuggestions, setEnrichedGameSuggestions] = useState<EnrichedGameSuggestion[]>([]);

  const [selectedRomIdentifiers, setSelectedRomIdentifiers] = useState<string[]>([]); // Stores 'filename' for selection tracking BEFORE enrichment

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);

  // Derived state: are we showing enriched results or initial scan results?
  const showingEnrichedResults = enrichedGameSuggestions.length > 0;

  useEffect(() => {
    setScannedRoms([]);
    setSelectedRomIdentifiers([]);
    setEnrichedGameSuggestions([]);
    setScanError(null);
    setImportMessage(null);
    setEnrichmentError(null);
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
    setEnrichmentError(null);
    setImportMessage(null);
    setScannedRoms([]);
    setSelectedRomIdentifiers([]);
    setEnrichedGameSuggestions([]); // Clear previous enrichment results

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

      const data: ScannedRomFile[] = await response.json();
      setScannedRoms(data);
      if (data.length === 0) {
        setScanError('No ROM files found. Check path and ignored extensions.');
      } else {
        // Automatically select all scanned ROMs for potential enrichment
        setSelectedRomIdentifiers(data.map(rom => rom.filename));
      }
    } catch (error: any) {
      console.error('Failed to scan ROMs:', error);
      setScanError(error.message || 'An unexpected error occurred during scan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrichRoms = async () => {
    if (selectedRomIdentifiers.length === 0) {
      setEnrichmentError('No ROMs selected to enrich.');
      return;
    }
    const platform = platforms.find(p => p.id.toString() === selectedPlatformId);
    if (!platform) {
      setEnrichmentError('Platform not found for enrichment.');
      return;
    }

    setIsLoading(true);
    setEnrichmentError(null);
    setImportMessage(null);

    const romsToEnrich = scannedRoms.filter(rom => selectedRomIdentifiers.includes(rom.filename));
    const romNamesToEnrich = romsToEnrich.map(r => r.name);

    try {
      const response = await fetch('/api/enrich-roms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ romNames: romNamesToEnrich, platformName: platform.name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      const enrichmentResult: { source: string; enriched_roms: EnrichedRomFromApi[] } = await response.json();

      const suggestionsMap = new Map<string, string>(
        enrichmentResult.enriched_roms.map((item: EnrichedRomFromApi) => [item.original_name, item.suggested_title])
      );

      const newSuggestions: EnrichedGameSuggestion[] = romsToEnrich.map(scannedRom => ({
        original_name: scannedRom.name,
        suggested_title: suggestionsMap.get(scannedRom.name) || scannedRom.name,
        filename: scannedRom.filename,
        user_title: suggestionsMap.get(scannedRom.name) || scannedRom.name, // Default user_title to suggested
        is_selected_for_import: true, // Default to selected
      }));

      setEnrichedGameSuggestions(newSuggestions);
      // Clear selections from the initial scan list as we are now using the enriched list
      setSelectedRomIdentifiers([]);
      setScannedRoms([]); // Clear raw scanned roms to avoid confusion, or hide that section

    } catch (error: any) {
      console.error('Failed to enrich ROMs:', error);
      setEnrichmentError(error.message || 'An unexpected error occurred during enrichment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection for the initial scanned list (before enrichment)
  const toggleInitialRomSelection = (romFilename: string) => {
    setSelectedRomIdentifiers(prevSelected =>
      prevSelected.includes(romFilename)
        ? prevSelected.filter(id => id !== romFilename)
        : [...prevSelected, romFilename]
    );
  };

  // Toggle selection for the enriched list
  const toggleEnrichedGameSelection = (filename: string) => {
    setEnrichedGameSuggestions(prevSuggestions =>
      prevSuggestions.map(suggestion =>
        suggestion.filename === filename
          ? { ...suggestion, is_selected_for_import: !suggestion.is_selected_for_import }
          : suggestion
      )
    );
  };

  // Select/deselect all for the initial scanned list
  const toggleSelectAllInitialRoms = () => {
    if (selectedRomIdentifiers.length === scannedRoms.length) {
      setSelectedRomIdentifiers([]);
    } else {
      setSelectedRomIdentifiers(scannedRoms.map(rom => rom.filename));
    }
  };

  // Select/deselect all for the enriched list
  const toggleSelectAllEnrichedGames = () => {
    const allCurrentlySelected = enrichedGameSuggestions.every(s => s.is_selected_for_import);
    setEnrichedGameSuggestions(prevSuggestions =>
      prevSuggestions.map(suggestion => ({
        ...suggestion,
        is_selected_for_import: !allCurrentlySelected,
      }))
    );
  };

  const handleUserTitleChange = (filename: string, newUserTitle: string) => {
    setEnrichedGameSuggestions(prevSuggestions =>
      prevSuggestions.map(suggestion =>
        suggestion.filename === filename
          ? { ...suggestion, user_title: newUserTitle }
          : suggestion
      )
    );
  };

  const handleImportRoms = () => {
    let gamesToImport: Game[];

    if (showingEnrichedResults) {
      gamesToImport = enrichedGameSuggestions
        .filter(suggestion => suggestion.is_selected_for_import)
        .map((suggestion, index) => ({
          id: `${selectedPlatformId}-${suggestion.original_name.replace(/\s+/g, '-')}-${Date.now() + index}`,
          title: suggestion.user_title,
          platformId: selectedPlatformId,
          romPath: `${romsPath}/${suggestion.filename}`,
          coverImageUrl: '', description: '', genre: '', releaseDate: '',
        }));
    } else { // Importing from initial scan (enrichment skipped or failed)
      gamesToImport = scannedRoms
        .filter(rom => selectedRomIdentifiers.includes(rom.filename))
        .map((rom, index) => ({
          id: `${selectedPlatformId}-${rom.name.replace(/\s+/g, '-')}-${Date.now() + index}`,
          title: rom.name,
          platformId: selectedPlatformId,
          romPath: `${romsPath}/${rom.filename}`,
          coverImageUrl: '', description: '', genre: '', releaseDate: '',
        }));
    }

    if (gamesToImport.length === 0) {
      setImportMessage('No ROMs selected for import.');
      return;
    }
    if (!selectedPlatformId) { // Should be caught by button disable logic mostly
      setImportMessage('No platform selected.');
      return;
    }

    try {
      onAddGames(gamesToImport);
      setImportMessage(`${gamesToImport.length} game(s) successfully prepared for import. Check your games list.`);
      // Clear selections
      if (showingEnrichedResults) {
        setEnrichedGameSuggestions(prev => prev.map(s => ({...s, is_selected_for_import: false})));
      } else {
        setSelectedRomIdentifiers([]);
      }
    } catch (error) {
      console.error('Error importing games:', error);
      setImportMessage('An error occurred while importing games.');
    }
  };

  const currentPlatformName = platforms.find(p => p.id.toString() === selectedPlatformId)?.name || "Selected Platform";
  const platformOptions = platforms.map(platform => ({ value: platform.id.toString(), label: platform.name }));

  const selectedCount = showingEnrichedResults
    ? enrichedGameSuggestions.filter(s => s.is_selected_for_import).length
    : selectedRomIdentifiers.length;

  const totalCount = showingEnrichedResults ? enrichedGameSuggestions.length : scannedRoms.length;


  return (
    <div className="p-4 md:p-6 bg-neutral-900 text-white min-h-screen">
      <header className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-primary">Scan ROMs</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Select a platform, specify the folder where its ROMs are, and import them into your library.
        </p>
      </header>

      <section className="space-y-4 md:space-y-6 max-w-3xl mx-auto bg-neutral-800 p-6 md:p-8 rounded-lg shadow-xl mb-8">
        {platforms.length === 0 ? (
          <p className="text-center text-yellow-400 bg-yellow-900/30 p-3 rounded-md">
            You need to configure a platform first. Go to 'Platforms' to add one.
          </p>
        ) : (
          <Select
            label="1. Select Platform" value={selectedPlatformId} onChange={(e) => setSelectedPlatformId(e.target.value)}
            options={platformOptions} placeholder="-- Select a Platform --" className="w-full"
            labelClassName="text-neutral-300 text-lg" selectClassName="bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
            disabled={isLoading}
          />
        )}
        <Input
          label="2. ROMs Folder Path" type="text" value={romsPath} onChange={(e) => setRomsPath(e.target.value)}
          placeholder="e.g., /Users/username/roms/snes or C:\\ROMs\\SNES" className="w-full"
          labelClassName="text-neutral-300 text-lg" inputClassName="bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
          helpText={`Default: ${DEFAULT_ROM_FOLDER}. Provide the full local path to the directory containing ROM files for ${currentPlatformName}.`}
          disabled={isLoading || !selectedPlatformId}
        />
        <Button
          onClick={handleScan} disabled={!selectedPlatformId || isLoading || platforms.length === 0}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading && !showingEnrichedResults ? <span>Scanning...</span> : <span>3. Begin Scan</span>}
        </Button>
        {scanError && <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md text-center">{scanError}</p>}
      </section>

      {/* Section for Scanned ROMs (before enrichment OR if enrichment is skipped/failed) */}
      {!showingEnrichedResults && scannedRoms.length > 0 && (
        <section className="space-y-4 md:space-y-6 max-w-3xl mx-auto bg-neutral-800 p-6 md:p-8 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-primary border-b border-neutral-700 pb-3 mb-4">
            Found {scannedRoms.length} Potential ROMs for {currentPlatformName}
          </h2>
          <div className="max-h-96 overflow-y-auto pr-2 space-y-2 bg-neutral-850 p-4 rounded-md">
            <div className="flex items-center mb-2 border-b border-neutral-700 pb-2">
              <label htmlFor="select-all-initial-roms" className="flex items-center space-x-2 cursor-pointer text-neutral-300">
                <input type="checkbox" id="select-all-initial-roms"
                  checked={selectedRomIdentifiers.length === scannedRoms.length && scannedRoms.length > 0}
                  onChange={toggleSelectAllInitialRoms}
                  className="form-checkbox h-5 w-5 text-primary bg-neutral-700 border-neutral-600 focus:ring-primary-dark" />
                <span>Select All ({selectedRomIdentifiers.length}/{scannedRoms.length})</span>
              </label>
            </div>
            {scannedRoms.map((rom) => (
              <div key={rom.filename} className="flex items-center p-2 hover:bg-neutral-700 rounded-md transition-colors duration-150">
                <label htmlFor={`rom-initial-${rom.filename.replace(/[^a-zA-Z0-9]/g, '-')}`} className="flex items-center space-x-2 cursor-pointer text-neutral-200 flex-grow">
                  <input type="checkbox" id={`rom-initial-${rom.filename.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    checked={selectedRomIdentifiers.includes(rom.filename)}
                    onChange={() => toggleInitialRomSelection(rom.filename)}
                    className="form-checkbox h-5 w-5 text-primary bg-neutral-700 border-neutral-600 focus:ring-primary-dark" />
                  <span>{rom.name}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-neutral-700">
            <Button onClick={handleEnrichRoms}
              disabled={isLoading || scannedRoms.length === 0 || selectedRomIdentifiers.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
              title="Use AI to clean up names and suggest titles">
              {isLoading ? 'Enriching...' : `Enrich Selected (${selectedRomIdentifiers.length})`}
            </Button>
            <Button onClick={handleImportRoms}
              disabled={isLoading || selectedRomIdentifiers.length === 0}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed">
              Import Selected ({selectedRomIdentifiers.length}) to Library
            </Button>
          </div>
          {enrichmentError && <p className="mt-2 text-sm text-red-400 bg-red-900/30 p-3 rounded-md text-center">{enrichmentError}</p>}
        </section>
      )}

      {/* Section for Enriched ROMs */}
      {showingEnrichedResults && (
         <section className="space-y-4 md:space-y-6 max-w-3xl mx-auto bg-neutral-800 p-6 md:p-8 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-primary border-b border-neutral-700 pb-3 mb-4">
            Enriched ROM Titles for {currentPlatformName}
          </h2>
          <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 bg-neutral-850 p-4 rounded-md">
            <div className="flex items-center mb-2 border-b border-neutral-700 pb-2 sticky top-0 bg-neutral-850 z-10">
              <label htmlFor="select-all-enriched-roms" className="flex items-center space-x-2 cursor-pointer text-neutral-300">
                <input type="checkbox" id="select-all-enriched-roms"
                  checked={enrichedGameSuggestions.every(s => s.is_selected_for_import) && enrichedGameSuggestions.length > 0}
                  onChange={toggleSelectAllEnrichedGames}
                  className="form-checkbox h-5 w-5 text-primary bg-neutral-700 border-neutral-600 focus:ring-primary-dark" />
                <span>Select All ({selectedCount}/{totalCount})</span>
              </label>
            </div>
            {enrichedGameSuggestions.map((suggestion) => (
              <div key={suggestion.filename} className="p-3 bg-neutral-700/30 rounded-md border border-neutral-700/50 hover:border-primary/50 transition-colors">
                <div className="flex items-start space-x-3">
                  <input type="checkbox" id={`rom-enriched-${suggestion.filename.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    checked={suggestion.is_selected_for_import}
                    onChange={() => toggleEnrichedGameSelection(suggestion.filename)}
                    className="form-checkbox h-5 w-5 text-primary bg-neutral-600 border-neutral-500 focus:ring-primary-dark mt-1" />
                  <div className="flex-grow">
                    <label htmlFor={`title-edit-${suggestion.filename}`} className="block text-xs text-neutral-400 mb-0.5">Original: {suggestion.original_name}</label>
                    <Input type="text"
                      id={`title-edit-${suggestion.filename}`}
                      value={suggestion.user_title}
                      onChange={(e) => handleUserTitleChange(suggestion.filename, e.target.value)}
                      inputClassName="w-full bg-neutral-600 border-neutral-500 text-white text-sm p-2 rounded focus:ring-primary focus:border-primary"
                      placeholder="Enter game title"
                    />
                     <p className="text-xs text-neutral-500 mt-1">AI Suggestion: {suggestion.suggested_title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
           <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-neutral-700">
            {/* Optional: Button to go back to scan results or re-scan? For now, just import. */}
            <Button onClick={handleImportRoms}
              disabled={isLoading || selectedCount === 0}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? 'Importing...' : `Import Selected (${selectedCount}) to Library`}
            </Button>
          </div>
          {enrichmentError && <p className="mt-2 text-sm text-red-400 bg-red-900/30 p-3 rounded-md text-center">{enrichmentError}</p>}
        </section>
      )}

      {/* General Import Message Area */}
      {importMessage && <p className={`max-w-3xl mx-auto mt-4 text-sm p-3 rounded-md text-center ${importMessage.includes("Error") || importMessage.includes("Failed") ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30'}`}>{importMessage}</p>}
    </div>
  );
};
