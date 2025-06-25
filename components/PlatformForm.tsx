
import React, { useState, useEffect, useCallback } from 'react';
import { Platform, TheGamesDBImage, TheGamesDBPlatformImagesResponse } from '../types'; // Added TheGamesDBImage types
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
  const [tgdbIconBaseUrl, setTgdbIconBaseUrl] = useState<string | null>(null); // Base URL for platform list icons

  // State for fetching specific platform images (fanart, banners, etc.)
  const [platformImages, setPlatformImages] = useState<TheGamesDBImage[]>([]);
  const [platformImagesBaseUrl, setPlatformImagesBaseUrl] = useState<string | null>(null);
  const [isLoadingPlatformImages, setIsLoadingPlatformImages] = useState<boolean>(false);
  const [errorPlatformImages, setErrorPlatformImages] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null); // For hover preview
  const [previewTimeoutId, setPreviewTimeoutId] = useState<NodeJS.Timeout | null>(null); // For hover delay


  useEffect(() => {
    if (isOpen && !initialPlatform) { // Only fetch for new platforms (the list of all platforms)
      setIsLoadingTgdbPlatforms(true);
      setErrorTgdbPlatforms(null);
      fetch('/api/thegamesdb/platforms')
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch TheGamesDB platforms: ${res.statusText}`);
          }
          return res.json();
        })
        .then((responseData: { platforms: Platform[], base_image_url?: string | null }) => {
            if (responseData && Array.isArray(responseData.platforms)) {
                const sortedPlatforms = responseData.platforms.sort((a, b) =>
                    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
                );
                setAvailableTgdbPlatforms(sortedPlatforms);
                if (responseData.base_image_url) {
                    setTgdbIconBaseUrl(responseData.base_image_url);
                    console.log("PlatformForm: Received base_image_url:", responseData.base_image_url);
                } else {
                    console.warn("PlatformForm: base_image_url not found in API response or is null.");
                    setTgdbIconBaseUrl(null); // Explicitly set to null if not provided
                }
            } else {
                throw new Error("Unexpected data format for TheGamesDB platforms response. 'platforms' array missing.");
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
      setPlatformImages([]); // Clear previously loaded images
      setPlatformImagesBaseUrl(null);
      setErrorPlatformImages(null);
    }
  }, [isOpen, initialPlatform]);

  // Effect to fetch platform images when a TGDB platform is selected
  useEffect(() => {
    if (selectedTgdbPlatformId && isOpen && !initialPlatform) { // Only for new platforms being added
      setIsLoadingPlatformImages(true);
      setErrorPlatformImages(null);
      setPlatformImages([]); // Clear previous images
      setPlatformImagesBaseUrl(null);

      fetch(`/api/thegamesdb/platform_images?id=${selectedTgdbPlatformId}`)
        .then(res => {
          if (!res.ok) {
            // Try to parse error JSON from proxy if available
            return res.json().then(errData => {
              throw new Error(errData.error || `Failed to fetch images: ${res.statusText}`);
            }).catch(() => { // Fallback if error response isn't JSON
              throw new Error(`Failed to fetch images: ${res.statusText} (status ${res.status})`);
            });
          }
          return res.json();
        })
        .then((data: TheGamesDBPlatformImagesResponse) => {
          if (data && data.base_url && Array.isArray(data.images)) {
            setPlatformImages(data.images);
            setPlatformImagesBaseUrl(data.base_url.original); // Assuming 'original' is desired
          } else {
            // This case should ideally be handled by the proxy and return a proper error or empty array.
            // If proxy returns 200 OK but unexpected structure, this is a fallback.
            console.warn("Unexpected data structure for platform images:", data);
            setPlatformImages([]); // Ensure it's an empty array if data is malformed
            // Potentially set an error message if base_url is missing but images are present, or vice-versa
            if (!data.base_url) setErrorPlatformImages("Image base URL missing in response.");
            else setErrorPlatformImages("Image data is malformed.");

          }
          setIsLoadingPlatformImages(false);
        })
        .catch(err => {
          console.error("Error fetching platform images:", err);
          setErrorPlatformImages(err.message || 'Could not load platform images.');
          setIsLoadingPlatformImages(false);
        });
    } else if (!selectedTgdbPlatformId) {
      // Clear images if no platform is selected (e.g., user deselects or form resets)
      setPlatformImages([]);
      setPlatformImagesBaseUrl(null);
      setErrorPlatformImages(null);
    }
  }, [selectedTgdbPlatformId, isOpen, initialPlatform]);

  const handleUserIconUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlatformData(prev => ({ ...prev, userIconUrl: e.target.value }));
  };

  // Generic handler for most text input fields
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPlatformData(prev => ({
      ...prev,
      [name]: value || '', // Ensure empty string if value is null/undefined from input
    }));
  };

  const handleTgdbPlatformSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setSelectedTgdbPlatformId(selectedId); // This will trigger the useEffect above to fetch images
    const tgdbPlatform = availableTgdbPlatforms.find(p => p.id.toString() === selectedId);

    if (tgdbPlatform) {
      let iconUrlToUse = tgdbPlatform.icon || '';
      if (tgdbIconBaseUrl && tgdbPlatform.icon && !tgdbPlatform.icon.startsWith('http')) {
        iconUrlToUse = `${tgdbIconBaseUrl.replace(/\/$/, '')}/${tgdbPlatform.icon.replace(/^\//, '')}`;
      }
      setPlatformData({
        ...tgdbPlatform,
        id: tgdbPlatform.id,
        userIconUrl: iconUrlToUse, // Default icon, will be overridden if user selects from platformImages
      });
    } else {
      // If user deselects (e.g. chooses placeholder "-- Choose a platform --")
      setPlatformData(newPlatformBase); // Reset to base, userIconUrl will be empty
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialPlatform) { // Editing existing platform
        if (!initialPlatform.id) {
            console.error("Attempting to submit edit for platform without an ID (from initialPlatform).");
            return;
        }
        // Construct the updated platform data, taking fresh info from platformData
        // and preserving essential parts like emulators from initialPlatform.
        const finalEditedPlatform: Platform = {
            ...(initialPlatform as Platform), // Start with all original data, critically including emulators
            ...(platformData as Partial<Omit<Platform, 'emulators'>>), // Overlay with form state (icon, and any other fields made editable)
            id: initialPlatform.id, // ID must be from the platform being edited
            name: platformData.name || initialPlatform.name, // Prioritize name from form data if it exists and changed
            userIconUrl: platformData.userIconUrl || '', // User's chosen icon from form state
        };
        onSubmit(finalEditedPlatform);

    } else { // Adding new platform
      if (!selectedTgdbPlatformId || !platformData.id) {
        // User must select a platform from TGDB list
        alert("Please select a platform from the list."); // Or some other form validation message
        return;
      }
      // platformData should already be populated by handleTgdbPlatformSelect
      // and userIconUrl can be further edited by handleUserIconUrlChange
      const newPlatformSubmission: Omit<Platform, 'emulators'> = {
        ...(platformData as Omit<Platform, 'emulators'>), // Type assertion
        id: Number(platformData.id), // Ensure id is number
        name: platformData.name || '', // Should be set from TGDB selection
        userIconUrl: platformData.userIconUrl || '',
      };
      onSubmit(newPlatformSubmission);
    }
  };

  const currentName = initialPlatform ? initialPlatform.name : (availableTgdbPlatforms.find(p => p.id.toString() === selectedTgdbPlatformId)?.name || 'New Platform');
  // If platformData.name is being edited, the title might ideally reflect platformData.name.
  // For now, keep initialPlatform.name for simplicity in title, actual data saved uses platformData.name.
  const displayNameInModalTitle = initialPlatform?.name || (availableTgdbPlatforms.find(p => p.id.toString() === selectedTgdbPlatformId)?.name || 'New Platform');


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

        {/* Section for selecting from fetched TheGamesDB images - only for new platforms */}
        {!initialPlatform && selectedTgdbPlatformId && (
          <div className="mt-4 pt-4 border-t border-neutral-700">
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Choose Platform Image (from TheGamesDB)</h4>
            {isLoadingPlatformImages && <p className="text-neutral-400">Loading images...</p>}
            {errorPlatformImages && <p className="text-red-500">Error: {errorPlatformImages}</p>}
            {!isLoadingPlatformImages && !errorPlatformImages && platformImages.length === 0 && selectedTgdbPlatformId && (
              <p className="text-neutral-500">No additional images found for this platform on TheGamesDB, or selection is still pending.</p>
            )}
            {platformImagesBaseUrl && platformImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1 bg-neutral-800 rounded-md">
                {platformImages.map(image => {
                  const fullImageUrl = `${platformImagesBaseUrl.replace(/\/$/, '')}/${image.filename.replace(/^\//, '')}`;
                  const isSelected = platformData.userIconUrl === fullImageUrl;
                  return (
                    <button
                      type="button"
                      key={image.id}
                      onClick={() => {
                        setPlatformData(prev => ({ ...prev, userIconUrl: fullImageUrl }));
                      }}
                      onMouseEnter={() => {
                        if (previewTimeoutId) clearTimeout(previewTimeoutId);
                        const timeoutId = setTimeout(() => setPreviewImageUrl(fullImageUrl), 300); // 300ms delay
                        setPreviewTimeoutId(timeoutId);
                      }}
                      onMouseLeave={() => {
                        if (previewTimeoutId) clearTimeout(previewTimeoutId);
                        setPreviewImageUrl(null);
                      }}
                      className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all
                                  ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-neutral-600 hover:border-primary-light focus:border-primary-light'}
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900`}
                      aria-label={`Select image ${image.filename} of type ${image.type}`}
                    >
                      <img
                        src={fullImageUrl}
                        alt={`Platform image ${image.filename} (${image.type})`}
                        className="w-full h-full object-contain bg-neutral-700" // object-contain is better for varying aspect ratios
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate" title={image.type}>
                        {image.type}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Display other TGDB info if available and a platform is selected (for new platforms) */}
        {platformData && selectedTgdbPlatformId && !initialPlatform && (
            <div className="space-y-2 text-xs text-neutral-400 border-t border-neutral-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-neutral-300 mb-1">Selected Platform Details (from TheGamesDB):</h4>
                {platformData.name && <p><strong>Name:</strong> {platformData.name}</p>}
                {platformData.alias && <p><strong>Alias:</strong> {platformData.alias}</p>}
                {platformData.manufacturer && <p><strong>Manufacturer:</strong> {platformData.manufacturer}</p>}
                {platformData.developer && <p><strong>Developer:</strong> {platformData.developer}</p>}
                {platformData.console && <p><strong>Console/Type:</strong> {platformData.console}</p>}
                {platformData.overview && <p className="max-h-20 overflow-y-auto"><strong>Overview:</strong> {platformData.overview}</p>}
            </div>
        )}

        {/* Editable Platform Details - only when editing */}
        {initialPlatform && (
          <div className="space-y-4 pt-4 mt-4 border-t border-neutral-700">
            <h4 className="text-base font-medium text-neutral-200 mb-3">Edit Platform Details</h4>
            <Input
              label="Platform Name"
              name="name"
              value={platformData.name || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., Commodore 64"
            />
            <Input
              label="Alias"
              name="alias"
              value={platformData.alias || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., C64"
            />
            <Textarea
              label="Overview"
              name="overview"
              value={platformData.overview || ''}
              onChange={handleDetailsChange}
              rows={4}
              placeholder="Brief description of the platform"
            />
            <Input
              label="Manufacturer"
              name="manufacturer"
              value={platformData.manufacturer || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., Commodore"
            />
            <Input
              label="Developer"
              name="developer"
              value={platformData.developer || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., Commodore Business Machines"
            />
            <Input
              label="Console/Type"
              name="console"
              value={platformData.console || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., Home computer"
            />
            <Input
              label="Media Type"
              name="media"
              value={platformData.media || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., Cartridge, Disk, Cassette"
            />
            <Input
              label="CPU"
              name="cpu"
              value={platformData.cpu || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., MOS Technology 6510"
            />
            <Input
              label="Memory"
              name="memory"
              value={platformData.memory || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., 64 KB RAM"
            />
            <Input
              label="Graphics"
              name="graphics"
              value={platformData.graphics || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., VIC-II"
            />
            <Input
              label="Sound"
              name="sound"
              value={platformData.sound || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., SID 6581"
            />
             <Input
              label="Max Controllers"
              name="maxcontrollers"
              value={platformData.maxcontrollers || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., 2"
            />
            <Input
              label="Display"
              name="display"
              value={platformData.display || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., RF, Composite"
            />
            <Input
              label="YouTube Video Link/ID"
              name="youtube"
              value={platformData.youtube || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., https://www.youtube.com/watch?v=VIDEO_ID or VIDEO_ID"
            />
            {/* Controller field was missing, adding it if it's in the types.ts Platform interface */}
            {/* Checking types.ts: 'controller' is present. */}
            <Input
              label="Controller Type(s)"
              name="controller"
              value={platformData.controller || ''}
              onChange={handleDetailsChange}
              placeholder="e.g., Joystick, Keyboard"
            />
          </div>
        )}
      </form>

      {/* Image Preview Overlay - positioned relative to the Modal's content area */}
      {previewImageUrl && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                     p-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl z-50
                     max-w-[calc(100%-4rem)] max-h-[calc(100%-8rem)] pointer-events-none" // pointer-events-none so it doesn't block clicks on underlying elements
          // Adjust max-w and max-h as needed, considering modal padding and desired preview size
        >
          <img
            src={previewImageUrl}
            alt="Preview"
            className="block max-w-full max-h-full object-contain rounded"
            // Example: max-h-[300px] or max-w-[400px] if more specific constraints are needed
            // The parent div's max-w/max-h will ultimately constrain it.
          />
        </div>
      )}
    </Modal>
  );
};
    