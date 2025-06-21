
import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { FolderIcon, SearchIcon } from '../components/Icons';

export const ScanView: React.FC = () => {
  const [folderPath, setFolderPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [scanComplete, setScanComplete] = useState(false);

  const handleScan = () => {
    if (!folderPath) {
      alert("Please enter a folder path to scan.");
      return;
    }
    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    setScanResults([]);

    // Simulate scanning process
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setScanComplete(true);
        // Simulate finding some ROMs
        setScanResults([
          `${folderPath}/game1.zip - Found (Matched: Super Game A)`,
          `${folderPath}/anothergame.rom - Found (Matched: Cool Game B)`,
          `${folderPath}/unknown.bin - Found (No match)`,
          `${folderPath}/archive/old_game.adf - Found (Matched: Retro Classic)`,
        ]);
      }
    }, 200);
  };

  useEffect(() => {
    // Cleanup interval if component unmounts during scan
    return () => {
      // This cleanup is conceptual. If an interval is active, it should be cleared.
      // However, in this simulation, interval is local to handleScan.
    };
  }, []);

  return (
    <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in">
      <header className="mb-8">
        <h2 className="text-4xl font-display font-bold text-neutral-100">Scan for ROMs</h2>
        <p className="text-neutral-400 text-sm">Find new games by scanning your ROM folders. (This is a simulation)</p>
      </header>

      <div className="bg-neutral-800 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
        <div className="mb-6">
          <Input
            label="ROM Folder Path"
            placeholder="e.g., C:\\Users\\You\\ROMs or /home/you/roms"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            disabled={isScanning}
            // TODO: Add icon to Input component for FolderIcon
          />
        </div>

        <Button 
          onClick={handleScan} 
          disabled={isScanning || !folderPath}
          leftIcon={<SearchIcon />}
          className="w-full"
          size="lg"
        >
          {isScanning ? `Scanning... ${scanProgress}%` : 'Start Scan'}
        </Button>

        {isScanning && (
          <div className="mt-6 w-full bg-neutral-700 rounded-full h-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-200 ease-linear" 
              style={{ width: `${scanProgress}%` }}
            ></div>
          </div>
        )}

        {scanComplete && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-neutral-200 mb-3">Scan Results:</h3>
            {scanResults.length > 0 ? (
              <ul className="space-y-2 bg-neutral-700 p-4 rounded-md max-h-60 overflow-y-auto">
                {scanResults.map((result, index) => (
                  <li key={index} className="text-sm text-neutral-300 border-b border-neutral-600 pb-1 last:border-b-0">
                    {result}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-400">No new ROMs found in the specified folder.</p>
            )}
             <p className="text-xs text-neutral-500 mt-4">Note: In a real application, these found ROMs would be processed and potentially added to your game library automatically or after confirmation.</p>
          </div>
        )}
      </div>
      
      <div className="mt-12 text-center text-neutral-500 text-sm">
          <FolderIcon className="w-12 h-12 mx-auto mb-2"/>
          <p>This ROM scanning feature is a simulation. Browser applications cannot directly access local file systems for scanning.</p>
          <p>In a native desktop application, this feature would integrate with your operating system to browse folders and identify game files.</p>
      </div>
    </div>
  );
};
    