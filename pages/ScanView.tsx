
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
// Input component might not be needed if we use browser's file input directly
// import { Input } from '../components/Input';
import { FolderOpenIcon, SearchIcon, SparklesIcon, UploadCloudIcon } from '../components/Icons'; // Using SparklesIcon for AI
import { Game } from '../types'; // For storing enriched game data

interface ScannedFile {
  id: string; // Path can serve as ID
  name: string; // File or folder name
  path: string; // Relative path within the selected folder
  type: 'file' | 'folder';
  selected: boolean;
  // AI enriched data
  title?: string;
  description?: string;
  genre?: string;
  releaseDate?: string;
}

interface ScanViewProps {
  // This will be passed from App.tsx eventually - Now handled by server
  // geminiApiKeyConfigured?: boolean;
  // Function to add games to the main list
  onAddGames?: (games: Game[], platformId: string) => void;
}

export const ScanView: React.FC<ScanViewProps> = ({ /* geminiApiKeyConfigured = false, */ onAddGames }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [platformId, setPlatformId] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Placeholder for API key status - replace with prop later
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(true); // TODO: Replace with geminiApiKeyConfigured prop

  useEffect(() => {
    if (location.state && location.state.platformId && location.state.platformName) {
      setPlatformId(location.state.platformId);
      setPlatformName(location.state.platformName);
    } else {
      // If no platform context, maybe redirect or show an error
      console.warn("ScanView loaded without platform context.");
      // navigate('/platforms'); // Optionally redirect
    }
  }, [location.state, navigate]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newScannedFiles: ScannedFile[] = Array.from(files).map(file => ({
        id: file.webkitRelativePath || file.name, // webkitRelativePath for folders
        name: file.name,
        path: file.webkitRelativePath || file.name,
        type: file.type === '' && !file.name.includes('.') ? 'folder' : 'file', // Basic type detection
        selected: true, // Select by default
      }));
      // Filter out common non-game files and very small files (e.g. .DS_Store, thumbs.db)
      const filteredFiles = newScannedFiles.filter(f =>
        !['.ds_store', 'thumbs.db'].includes(f.name.toLowerCase()) &&
        (f.type === 'folder' || f.path.length > 0) // Ensure path exists
      );
      setScannedFiles(filteredFiles);
    }
  };

  const toggleFileSelection = (id: string) => {
    setScannedFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === id ? { ...file, selected: !file.selected } : file
      )
    );
  };

  const handleFetchDetailsWithAI = async () => {
    if (!platformName) {
      alert("Platform name is missing. Cannot fetch AI details.");
      return;
    }
    const selectedFiles = scannedFiles.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      alert("No files selected to fetch details for.");
      return;
    }

    setIsLoadingAi(true);
    const batchSize = 20;
    let allAiResults: Record<string, Partial<ScannedFile>> = {};

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      // Prepare the gameList for the enrich-gamelist endpoint
      const gameListForApi = batch.map(file => ({
        title: file.name, // Use file.name as the title for enrichment
        // platform: platformName, // Platform context can be useful for the AI
        // You could add other known details here if the API supports them
      }));

      console.log("Sending game list to AI for batch:", gameListForApi.map(g => g.title));

      try {
        const response = await fetch('/api/gemini/enrich-gamelist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameList: gameListForApi,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
          console.error('Error from Gemini API proxy (enrich-gamelist):', errorData);
          alert(`Error fetching details from AI: ${errorData.message || errorData.error || response.statusText}`);
          continue; // Try next batch
        }

        const result = await response.json(); // Expecting { source: 'Gemini', enriched_games: [...] }
        console.log("AI Enrich Result:", result);

        if (result.enriched_games && Array.isArray(result.enriched_games)) {
          result.enriched_games.forEach((enrichedGame: any, index: number) => {
            // The backend's enrich-gamelist currently doesn't return 'original_filename'.
            // It processes titles in order. So we map back by index in the batch.
            // This assumes the AI returns one enriched object per game title sent, in the same order.
            const originalFile = batch[index]; // Get the original file by index from the batch
            if (originalFile && enrichedGame.title && enrichedGame.description) {
              allAiResults[originalFile.id] = {
                title: enrichedGame.title,
                description: enrichedGame.description,
                genre: enrichedGame.genre || '', // Ensure genre and releaseDate are handled if missing
                releaseDate: enrichedGame.releaseDate || '',
              };
            } else if (originalFile) {
              console.warn(`Missing title or description for ${originalFile.name} in AI response batch item:`, enrichedGame);
            }
          });
        } else {
           console.warn('AI response did not contain an enriched_games array:', result);
        }

      } catch (error) {
        console.error('Network error or other issue calling /api/gemini/enrich-gamelist:', error);
        alert(`Network error fetching AI details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Stop processing further batches on network error
        setIsLoadingAi(false);
        return;
      }
    }

    // Update scannedFiles state with all collected AI results
    setScannedFiles(prevFiles =>
      prevFiles.map(file => {
        if (allAiResults[file.id]) {
          return { ...file, ...allAiResults[file.id] };
        }
        return file;
      })
    );

    setIsLoadingAi(false);
    if (Object.keys(allAiResults).length > 0) {
      alert("AI details fetched successfully for some items!");
    } else {
      alert("AI details fetching complete, but no data was successfully processed. Check console.");
    }
  };

  const handleImportGames = () => {
    if (!platformId) {
      alert("Platform ID is missing. Cannot import games.");
      return;
    }
    const gamesToImport: Game[] = scannedFiles
      .filter(file => file.selected && file.title) // Only import if selected and has a title (e.g. from AI)
      .map(file => ({
        id: crypto.randomUUID(), // Generate new ID for the game
        title: file.title!,
        platformId: platformId,
        romPath: file.path, // Using relative path as romPath
        coverImageUrl: '', // No cover image from this scan initially
        description: file.description || '',
        genre: file.genre || '',
        releaseDate: file.releaseDate || '',
      }));

    if (gamesToImport.length > 0) {
      if (onAddGames) {
        onAddGames(gamesToImport, platformId);
        alert(`${gamesToImport.length} games imported for ${platformName}!`);
        navigate('/games'); // Navigate to games view after import
      } else {
        console.warn("onAddGames function not provided. Games cannot be imported.");
        alert("Import function not available.");
      }
    } else {
      alert("No games selected or detailed enough for import.");
    }
  };

  if (!platformId || !platformName) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Loading platform information or platform not selected. Please go back to Platforms and try again.
      </div>
    );
  }

  return (
    <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in flex flex-col">
      <header className="mb-6">
        <h2 className="text-4xl font-display font-bold text-neutral-100">
          Scan ROMs for <span className="text-primary">{platformName}</span>
        </h2>
        <p className="text-neutral-400 text-sm">Select a folder containing your ROMs for this platform.</p>
      </header>

      <div className="mb-6">
        <Button 
          onClick={() => fileInputRef.current?.click()}
          leftIcon={<FolderOpenIcon />}
          variant="secondary"
          size="lg"
        >
          Select ROMs Folder
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          // @ts-ignore because webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          aria-label="Select ROMs folder"
        />
        <p className="text-xs text-neutral-500 mt-2">
          Your browser will ask for permission to read the contents of the selected folder. Only file and folder names are read.
        </p>
      </div>

      {scannedFiles.length > 0 && (
        <div className="flex-grow bg-neutral-800 p-6 rounded-lg shadow-xl flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-neutral-200">Found Files & Folders ({scannedFiles.filter(f => f.selected).length} / {scannedFiles.length} selected)</h3>
            <div className="flex space-x-2">
              {isGeminiConfigured && (
                <Button
                  onClick={handleFetchDetailsWithAI}
                  disabled={isLoadingAi || scannedFiles.filter(f => f.selected).length === 0}
                  leftIcon={<SparklesIcon />}
                  variant="secondary"
                >
                  {isLoadingAi ? 'Fetching AI Details...' : 'Fetch Game Details with AI'}
                </Button>
              )}
              <Button
                onClick={handleImportGames}
                disabled={scannedFiles.filter(f => f.selected && f.title).length === 0}
                leftIcon={<UploadCloudIcon />}
                variant="primary"
              >
                Import Selected Games
              </Button>
            </div>
          </div>

          <ul className="space-y-2 overflow-y-auto flex-grow pr-2">
            {scannedFiles.map((file) => (
              <li
                key={file.id}
                className={`p-3 rounded-md flex items-start justify-between transition-colors duration-150 ease-in-out
                            ${file.selected ? 'bg-neutral-700 hover:bg-neutral-600/80' : 'bg-neutral-750 opacity-60 hover:bg-neutral-700'}`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={file.selected}
                    onChange={() => toggleFileSelection(file.id)}
                    className="mt-1 h-5 w-5 rounded bg-neutral-600 border-neutral-500 text-primary focus:ring-primary focus:ring-offset-neutral-700"
                    aria-labelledby={`file-label-${file.id}`}
                  />
                  <div className="flex-grow">
                    <span id={`file-label-${file.id}`} className="font-medium text-neutral-100">{file.name}</span>
                    <p className="text-xs text-neutral-400">{file.path}</p>
                    {file.title && file.selected && (
                       <div className="mt-1 p-2 bg-neutral-600/50 rounded text-xs">
                          <p className="text-primary-light font-semibold">{file.title}</p>
                          {file.description && <p className="text-neutral-300">{file.description}</p>}
                          {file.genre && <p className="text-neutral-400">Genre: {file.genre}</p>}
                          {file.releaseDate && <p className="text-neutral-400">Released: {file.releaseDate}</p>}
                       </div>
                    )}
                  </div>
                </div>
                {/* Placeholder for individual actions if needed later */}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {scannedFiles.length === 0 && (
         <div className="mt-12 text-center text-neutral-500 text-sm">
            <FolderOpenIcon className="w-16 h-16 mx-auto mb-3 text-neutral-600"/>
            <p className="text-lg">No folder selected yet.</p>
            <p>Click the "Select ROMs Folder" button above to begin.</p>
        </div>
      )}
    </div>
  );
};