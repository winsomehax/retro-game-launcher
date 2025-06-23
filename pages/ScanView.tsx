
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
// Input component might not be needed if we use browser's file input directly
// import { Input } from '../components/Input';
import { FolderOpenIcon, SparklesIcon, UploadCloudIcon } from '../components/Icons'; // Using SparklesIcon for AI
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
  // This will be passed from App.tsx eventually
  geminiApiKeyConfigured?: boolean;
  // Function to add games to the main list
  onAddGames?: (games: Game[], platformId: string) => void;
}

export const ScanView: React.FC<ScanViewProps> = ({ geminiApiKeyConfigured = false, onAddGames }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [platformId, setPlatformId] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

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
    const batchSize = 20; // Keep batching to not overload the prompt/API
    let allAiResults: Record<string, Partial<ScannedFile>> = {};

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      const fileNames = batch.map(file => file.name);
      const fileListString = fileNames.join('\n');

      const prompt = `You are an expert in retro gaming and metadata. Based on the platform and a list of ROM filenames, identify the full game title, a concise 1-2 sentence description, the primary genre, and the release year.

You MUST return ONLY a valid JSON array of objects. Each object in the array must correspond to one of the input ROMs and have the following structure:
{
  "original_filename": "the_rom_filename.zip",
  "title": "The Full Game Title",
  "description": "A short description of the game.",
  "genre": "Action",
  "releaseDate": "YYYY"
}

If you cannot identify a game, use the filename for the title and leave other fields as empty strings. Do not include any explanations or text outside of the JSON array.

Platform: "${platformName}"
Filenames:
${fileListString}
`;

      console.log("Sending prompt to backend for AI enrichment for batch...");

      try {
        // The backend endpoint proxies the request to Gemini. We must format the body correctly.
        const apiUrl = '/api/gemini/enrich-gamelist';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // The body must be in the format expected by the Gemini API.
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (!response.ok) {
          // The backend should now return a structured JSON error
          let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch (e) {
            // Fallback for non-JSON error responses
            const textError = await response.text();
            if (textError) errorMessage = textError;
          }
          console.error('Error from backend enrichment endpoint:', errorMessage);
          alert(`Error fetching details from AI: ${errorMessage}`);
          // Continue to the next batch
          continue;
        }

        const apiResponse = await response.json();
        console.log("Received raw response from backend:", apiResponse);

        let aiDataArray: Array<{original_filename: string, title: string, description: string, genre: string, releaseDate: string}> = [];

        if (apiResponse.generated_text) {
          try {
            let jsonString = apiResponse.generated_text.trim();
            // AI might wrap the JSON in markdown code blocks, so we strip them.
            if (jsonString.startsWith('```json')) {
              jsonString = jsonString.substring(7, jsonString.length - 3).trim();
            } else if (jsonString.startsWith('```')) {
              jsonString = jsonString.substring(3, jsonString.length - 3).trim();
            }
            aiDataArray = JSON.parse(jsonString);
          } catch (e) {
            console.error("Failed to parse JSON from AI response text:", apiResponse.generated_text, e);
            alert("AI returned data in an unexpected format. Check console for details.");
            continue;
          }
        } else {
          throw new Error("Unexpected response structure from enrichment API. Expected 'generated_text' field.");
        }

        aiDataArray.forEach(aiDataItem => {
          // Find the original file from the batch to get its ID (path)
          const originalFile = batch.find(f => f.name === aiDataItem.original_filename);
          if (originalFile) {
            allAiResults[originalFile.id] = {
              title: aiDataItem.title,
              description: aiDataItem.description,
              genre: aiDataItem.genre,
              releaseDate: aiDataItem.releaseDate,
            };
          }
        });

      } catch (error) {
        console.error('Network error or other issue calling /api/gemini/enrich-gamelist:', error);
        alert(`Network error fetching AI details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Stop processing further batches on a network error
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
              {geminiApiKeyConfigured && (
                <Button
                  onClick={handleFetchDetailsWithAI}
                  disabled={isLoadingAi || scannedFiles.filter(f => f.selected).length === 0}
                  leftIcon={<SparklesIcon />}
                  variant="ghost"
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