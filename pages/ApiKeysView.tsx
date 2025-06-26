import React, { useState, useEffect } from 'react';
import { ApiKeyEntry } from '../types';
import { Button } from '../components/Button';
import { KeyIcon, EditIcon, CheckIcon, XIcon } from '../components/Icons'; // Assuming XIcon and CheckIcon exist
import { Input } from '../components/Input';

interface ApiKeysViewProps {
  apiKeys: ApiKeyEntry[];
  onUpdateApiKey: (apiKey: ApiKeyEntry) => void;
}

const maskApiKey = (key: string) => {
  if (!key) return 'Not Set';
  if (key.length <= 12) return '••••••••••••';
  return `${key.substring(0, 6)}••••••••${key.substring(key.length - 6)}`;
};

const ApiKeyField: React.FC<{
  label: string;
  description: string;
  value: string;
  onSave: (value: string) => void;
}> = ({ label, description, value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);

  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsEditing(false);
  };

  return (
    <div className="p-4 bg-neutral-700/50 rounded-lg">
      <label className="block text-lg font-medium text-neutral-100">{label}</label>
      <p className="text-sm text-neutral-400 mb-3">{description}</p>
      <div className="flex items-center space-x-2">
        {isEditing ? (
          <>
            <Input
              type="password"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="flex-grow font-mono"
              placeholder="Enter new API Key"
            />
            <Button onClick={handleSave} variant="primary" size="sm" aria-label="Save API Key">
              <CheckIcon className="w-5 h-5" />
            </Button>
            <Button onClick={handleCancel} variant="ghost" size="sm" aria-label="Cancel editing">
              <XIcon className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <>
            <p className="flex-grow font-mono text-neutral-300 bg-neutral-800/60 px-3 py-2 rounded-md">
              {maskApiKey(value)}
            </p>
            <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm" aria-label={`Edit ${label}`}>
              <EditIcon className="w-5 h-5 mr-2" />
              Edit
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({
  apiKeys,
  onUpdateApiKey,
}) => {
  // This component no longer needs its own state for the keys.
  // It will read directly from the apiKeys prop.

  const handleSave = (key: string, value: string) => {
    onUpdateApiKey({ id: key, serviceName: key, apiKey: value });
  };

  const getKey = (id: string) => apiKeys.find(k => k.id === id)?.apiKey || '';

  if (!apiKeys) {
    return (
        <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in text-center text-neutral-500">
            <KeyIcon className="w-20 h-20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Error loading API Key settings.</h3>
            <p>Please ensure the application is configured correctly. Check console for details.</p>
        </div>
    );
  }

  return (
    <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in">
      <header className="mb-8">
        <div>
          <h2 className="text-4xl font-display font-bold text-neutral-100">API Key Management</h2>
          <p className="text-neutral-400 text-sm">Configure API keys for external services.</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <ApiKeyField
          label="GitHub Personal Access Token"
          description="Used for fetching data from GitHub repositories. Requires `public_repo` scope."
          value={getKey('GITHUB_PAT_TOKEN')}
          onSave={(value) => handleSave('GITHUB_PAT_TOKEN', value)}
        />
        <ApiKeyField
          label="TheGamesDB API Key"
          description="Used for fetching game metadata and artwork from TheGamesDB.net."
          value={getKey('THEGAMESDB_API_KEY')}
          onSave={(value) => handleSave('THEGAMESDB_API_KEY', value)}
        />
        <ApiKeyField
          label="Google Gemini API Key"
          description="Used for generating game descriptions and other AI-powered features."
          value={getKey('GEMINI_API_KEY')}
          onSave={(value) => handleSave('GEMINI_API_KEY', value)}
        />
        <ApiKeyField
          label="RAWG.io API Key"
          description="Used as an alternative source for game information from RAWG.io."
          value={getKey('RAWG_API_KEY')}
          onSave={(value) => handleSave('RAWG_API_KEY', value)}
        />
      </div>
      
      <div className="max-w-4xl mx-auto mt-8 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg text-center text-sm text-neutral-400">
        <p><strong>Note:</strong> API key modifications are saved to the <code>.env</code> file in the project root.</p>
        <p>You must restart the server for these changes to take effect.</p>
      </div>
    </div>
  );
};