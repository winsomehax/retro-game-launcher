
import React, { useState, useEffect, useCallback } from 'react';
import { Platform } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Modal } from './Modal';
import { Select } from './Select'; // Import Select component

interface PlatformFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (platform: Omit<Platform, 'emulators'>) => void;
  initialPlatform?: Platform | null; // Changed to full Platform type
}

// Base for a new platform before selection from TGDB
const newPlatformBase: Partial<Omit<Platform, 'emulators'>> = {
    name: '',
    userIconUrl: '',
};

export const PlatformForm: React.FC<PlatformFormProps> = ({ isOpen, onClose, onSubmit, initialPlatform }) => {
  const [platformData, setPlatformData] = useState<Partial<Omit<Platform, 'emulators'>>>(initialPlatform || newPlatformBase);
  const [availableTgdbPlatforms, setAvailableTgdbPlatforms] = useState<Platform[]>([]);
  const [selectedTgdbPlatformId, setSelectedTgdbPlatformId] = useState<string>('');
  const [isLoadingTgdbPlatforms, setIsLoadingTgdbPlatforms] = useState(false);
  const [errorTgdbPlatforms, setErrorTgdbPlatforms] = useState<string | null>(null);

  // Store the base URL for icons if provided by the API response
  // For now, this is a placeholder. It would be populated if /api/thegamesdb/platforms returns it.
  const [tgdbIconBaseUrl, setTgdbIconBaseUrl] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen && !initialPlatform) { // Only fetch for new platforms
      setIsLoadingTgdbPlatforms(true);
      setErrorTgdbPlatforms(null);
      fetch('/api/thegamesdb/platforms')
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch TheGamesDB platforms: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: Platform[] | { platforms: Platform[], base_image_url?: string }) => {
            // Check if data is an object with platforms and base_image_url
            if (typeof data === 'object' && data !== null && Array.isArray((data as any).platforms)) {
                setAvailableTgdbPlatforms((data as any).platforms);
                if ((data as any).base_image_url) {
                    setTgdbIconBaseUrl((data as any).base_image_url);
                }
            } else if (Array.isArray(data)) { // Fallback for if API just returns array
                 setAvailableTgdbPlatforms(data as Platform[]);
            } else {
                throw new Error("Unexpected data format for TheGamesDB platforms");
            }
            setIsLoadingTgdbPlatforms(false);
        })
        .catch(err => {
          console.error(err);
          setErrorTgdbPlatforms(err.message || 'Could not load platforms.');
          setIsLoadingTgdbPlatforms(false);
        });
    }

    if (initialPlatform) {
      // When editing, populate form with existing data
      // Note: Platform 'name' (and other TGDB fields) are not directly editable if it's from TGDB.
      // User can only edit 'userIconUrl' and emulators (handled elsewhere).
      setPlatformData({
        ...initialPlatform, // Spread all fields from initialPlatform
        userIconUrl: initialPlatform.userIconUrl || initialPlatform.icon || '', // Prioritize userIconUrl
      });
      setSelectedTgdbPlatformId(initialPlatform.id.toString()); // id is number, select expects string
    } else {
      // Reset for new platform
      setPlatformData(newPlatformBase);
      setSelectedTgdbPlatformId('');
    }
  }, [isOpen, initialPlatform]);

  const handleUserIconUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlatformData(prev => ({ ...prev, userIconUrl: e.target.value }));
  };

  const handleTgdbPlatformSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setSelectedTgdbPlatformId(selectedId);
    const tgdbPlatform = availableTgdbPlatforms.find(p => p.id.toString() === selectedId);

    if (tgdbPlatform) {
      let iconUrlToUse = tgdbPlatform.icon || '';
      // Basic check if icon is a full URL or needs a base path.
      // This might need more sophisticated logic based on actual TGDB API response for icons.
      if (tgdbIconBaseUrl && tgdbPlatform.icon && !tgdbPlatform.icon.startsWith('http')) {
        iconUrlToUse = `${tgdbIconBaseUrl.replace(/\/$/, '')}/${tgdbPlatform.icon.replace(/^\//, '')}`;
      }

      setPlatformData({
        ...tgdbPlatform, // Spread all fields from selected TGDB platform
        id: tgdbPlatform.id, // Ensure ID is the numeric one from TGDB
        userIconUrl: iconUrlToUse, // Pre-fill userIconUrl from TGDB's icon
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialPlatform) { // Editing existing platform
        if (!platformData.id) { // Should always have an ID when editing
            console.error("Attempting to submit edit for platform without an ID.");
            return;
        }
        const editedPlatform: Omit<Platform, 'emulators'> = {
            ...(initialPlatform as Omit<Platform, 'emulators'>), // Start with all original data
            id: initialPlatform.id, // ensure numeric ID
            name: initialPlatform.name, // Name shouldn't change if from TGDB
            // Update only user-editable fields
            userIconUrl: platformData.userIconUrl || '',
            // Potentially other TGDB fields if we decide they can be locally overridden, though plan implies they are cached as-is
        };
        onSubmit(editedPlatform);

    } else { // Adding new platform
      if (!selectedTgdbPlatformId || !platformData.id) {
        // User must select a platform from TGDB list
        alert("Please select a platform from the list."); // Or some other form validation message
        return;
      }
      // platformData should already be populated by handleTgdbPlatformSelect
      // and userIconUrl can be further edited by handleUserIconUrlChange
      const newPlatform: Omit<Platform, 'emulators'> = {
        ...(platformData as Omit<Platform, 'emulators'>), // Type assertion
        id: Number(platformData.id), // Ensure id is number
        name: platformData.name || '', // Should be set from TGDB selection
        userIconUrl: platformData.userIconUrl || '',
      };
      onSubmit(newPlatform);
    }
  };

  const currentName = initialPlatform ? initialPlatform.name : (availableTgdbPlatforms.find(p => p.id.toString() === selectedTgdbPlatformId)?.name || 'New Platform');

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialPlatform ? `Edit Platform: ${currentName}` : 'Add New Platform from TheGamesDB'}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" form="platform-form" variant="primary" disabled={isLoadingTgdbPlatforms || ( !initialPlatform && !selectedTgdbPlatformId )}>
                    {initialPlatform ? 'Save Changes' : 'Add Platform'}
                </Button>
            </>
        }
    >
      <form id="platform-form" onSubmit={handleSubmit} className="space-y-6 p-1">
        {initialPlatform ? (
          <div>
            <p className="block text-sm font-medium text-neutral-300 mb-1">Platform Name</p>
            <p className="px-4 py-2.5 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-lg shadow-sm">
              {initialPlatform.name} (ID: {initialPlatform.id})
            </p>
            <p className="mt-1 text-xs text-neutral-500">Platform name and ID are from TheGamesDB and cannot be changed.</p>
          </div>
        ) : (
          isLoadingTgdbPlatforms ? <p className="text-neutral-400">Loading platforms...</p> :
          errorTgdbPlatforms ? <p className="text-red-400">Error: {errorTgdbPlatforms}</p> :
          availableTgdbPlatforms.length > 0 ? (
            <Select
              label="Select Platform from TheGamesDB"
              options={availableTgdbPlatforms.map(p => ({ value: p.id.toString(), label: p.name }))}
              value={selectedTgdbPlatformId}
              onChange={handleTgdbPlatformSelect}
              placeholder="-- Choose a platform --"
              required
            />
          ) : (
            <p className="text-neutral-400">No platforms available from TheGamesDB. Check server connection.</p>
          )
        )}

        { (initialPlatform || selectedTgdbPlatformId) && (
            <Input
                label="Custom Icon URL (Optional)"
                name="userIconUrl"
                value={platformData.userIconUrl || ''}
                onChange={handleUserIconUrlChange}
                placeholder="https://example.com/icon.png"
            />
        )}

        {/* Display other TGDB info if available and a platform is selected (for new platforms) or when editing */}
        {platformData && (initialPlatform || selectedTgdbPlatformId) && !initialPlatform && (
            <div className="space-y-2 text-xs text-neutral-400 border-t border-neutral-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-neutral-300 mb-1">Selected Platform Details (from TheGamesDB):</h4>
                {platformData.alias && <p><strong>Alias:</strong> {platformData.alias}</p>}
                {platformData.manufacturer && <p><strong>Manufacturer:</strong> {platformData.manufacturer}</p>}
                {platformData.console && <p><strong>Console:</strong> {platformData.console}</p>}
                {platformData.overview && <p className="max-h-20 overflow-y-auto"><strong>Overview:</strong> {platformData.overview}</p>}
            </div>
        )}
      </form>
    </Modal>
  );
};
    