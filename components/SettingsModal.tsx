import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Select } from './Select'; // Assuming a Select component exists
import { ExternalLinkIcon, XIcon } from './Icons'; // Assuming ExternalLinkIcon exists

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void; // To navigate to API keys page
}

const AI_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'github', label: 'GitHub Models' },
  { value: 'mock', label: 'Mock AI (for testing)' },
];

const AI_STORAGE_KEY = 'selectedAiService';
// Placeholder for where DEFAULT_ROM_BASE might come from.
// In a real app, this might be fetched from a server or an env variable.
const DEFAULT_ROM_BASE_PATH = "Typically configured via a server-side .env file (e.g., DEFAULT_ROM_BASE=/mnt/roms)";


export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [selectedAi, setSelectedAi] = useState<string>(() => {
    return localStorage.getItem(AI_STORAGE_KEY) || AI_OPTIONS[0].value;
  });

  useEffect(() => {
    localStorage.setItem(AI_STORAGE_KEY, selectedAi);
  }, [selectedAi]);

  const handleAiChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAi(event.target.value);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings">
      <div className="space-y-6 p-1"> {/* Reduced padding for content area if Modal already has padding */}

        {/* DEFAULT_ROM_BASE Display */}
        <div className="p-4 bg-neutral-700/50 rounded-lg">
          <h3 className="text-lg font-medium text-neutral-100 mb-1">Default ROMs Base Path</h3>
          <p className="text-sm text-neutral-300 font-mono bg-neutral-800/60 px-3 py-2 rounded-md">
            {DEFAULT_ROM_BASE_PATH}
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            This setting typically defines the root folder for your ROM collections.
            It's usually configured on the server or via an environment variable.
            Changing this may require a server restart.
          </p>
        </div>

        {/* AI Service Selection */}
        <div className="p-4 bg-neutral-700/50 rounded-lg">
          <label htmlFor="ai-select" className="block text-lg font-medium text-neutral-100 mb-2">
            AI Enrichment Service
          </label>
          <Select
            id="ai-select"
            value={selectedAi}
            onChange={handleAiChange}
            options={AI_OPTIONS}
            className="w-full"
          />
          <p className="text-xs text-neutral-400 mt-2">
            Select the AI service to use for enriching game data (e.g., fetching descriptions, genres).
          </p>
        </div>

        {/* API Keys Link */}
        <div className="p-4 bg-neutral-700/50 rounded-lg">
          <h3 className="text-lg font-medium text-neutral-100 mb-2">API Key Management</h3>
          <p className="text-sm text-neutral-400 mb-3">
            Configure API keys for external services like TheGamesDB, Gemini, etc.
          </p>
          <Button
            onClick={() => {
              onNavigate('/apikeys');
              onClose(); // Close modal after navigation
            }}
            variant="secondary"
            leftIcon={<ExternalLinkIcon className="w-5 h-5" />}
          >
            Go to API Keys
          </Button>
        </div>

        <div className="mt-8 flex justify-end pt-1">
          <Button onClick={onClose} variant="outline" leftIcon={<XIcon className="w-5 h-5" />}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
