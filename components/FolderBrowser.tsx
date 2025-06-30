import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './Button';
import { DEFAULT_ROM_FOLDER } from '../constants';

interface FileSystemItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface FolderBrowserProps {
  initialPath?: string;
  onPathSelected: (path: string) => void;
  onCancel?: () => void;
}

export const FolderBrowser: React.FC<FolderBrowserProps> = ({
  initialPath,
  onPathSelected,
  onCancel,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || DEFAULT_ROM_FOLDER || '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectoryContents = useCallback(async (pathToList: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const encodedPath = encodeURIComponent(pathToList);
      const response = await fetch(`/api/fs/list?path=${encodedPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Failed to list directory: ${response.status}`);
      }
      const data = await response.json();
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setItems(data.items);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array for useCallback as it doesn't depend on props/state from this scope

  useEffect(() => {
    // Fetch initial directory contents based on the initial currentPath
    fetchDirectoryContents(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDirectoryContents]); // fetchDirectoryContents is stable due to useCallback with empty deps.
                               // currentPath is intentionally omitted to only run on initial mount based on initial `currentPath` state.

  const handleNavigate = (newPath: string) => {
    if (newPath) {
      fetchDirectoryContents(newPath);
    }
  };

  const handleSelectItem = (item: FileSystemItem) => {
    if (item.isDirectory) {
      handleNavigate(item.path);
    }
  };

  const handleGoUp = () => {
    if (parentPath) {
      handleNavigate(parentPath);
    }
  };

  const handleSelectCurrentFolder = () => {
    onPathSelected(currentPath);
  };

  return (
    <div className="p-4 bg-neutral-800 text-white rounded-lg shadow-lg max-w-2xl mx-auto my-4 border border-neutral-700">
      <h3 className="text-xl font-semibold mb-3 text-primary">Browse for Folder</h3>

      <div className="mb-3 p-2 bg-neutral-700 rounded">
        <p className="text-xs text-neutral-400">Current Path:</p>
        <p className="font-mono text-neutral-200 break-all">{currentPath}</p>
      </div>

      {error && <div className="mb-3 p-2 bg-red-800/80 text-red-100 rounded text-sm border border-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-3">
        <Button onClick={handleGoUp} disabled={isLoading || !parentPath} className="bg-neutral-600 hover:bg-neutral-500">
          {/* Icon for Go Up could be added here */}
          Go Up
        </Button>
        <Button onClick={handleSelectCurrentFolder} disabled={isLoading || !!error} className="bg-green-600 hover:bg-green-500 flex-grow">
          {/* Icon for Select could be added here */}
          Select This Folder
        </Button>
        {onCancel && (
          <Button onClick={onCancel} disabled={isLoading} className="bg-red-600 hover:bg-red-500">
            {/* Icon for Cancel could be added here */}
            Cancel
          </Button>
        )}
      </div>

      {isLoading && <div className="text-center p-4 text-neutral-400">Loading directory...</div>}

      {!isLoading && !error && items.length === 0 && (
        <div className="text-center p-4 text-neutral-500">This folder is empty or inaccessible.</div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <ul className="h-64 overflow-y-auto border border-neutral-700 rounded bg-neutral-850 p-2 space-y-1">
          {items.map((item) => (
            <li key={item.name}>
              <button
                onClick={() => handleSelectItem(item)}
                className={`w-full text-left p-2 rounded hover:bg-neutral-700 focus:outline-none focus:bg-neutral-600 transition-colors duration-150 flex items-center space-x-2 ${
                  item.isDirectory ? 'font-semibold text-sky-300 hover:text-sky-200' : 'text-neutral-300 hover:text-neutral-100'
                }`}
                title={item.path}
              >
                <span className="text-lg">{item.isDirectory ? '📁' : '📄'}</span>
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Ensure Button.tsx exists in components/ and DEFAULT_ROM_FOLDER in constants.ts
// Basic styling uses Tailwind CSS classes.
