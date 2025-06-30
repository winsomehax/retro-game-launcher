import React, { useState, useEffect } from 'react';
import { ApiKeyEntry } from '../types';
import { Button } from '../components/Button';
import { KeyIcon, EditIcon, CheckIcon, XIcon } from '../components/Icons'; // Assuming XIcon and CheckIcon exist
import { Input } from '../components/Input';
// Removed incorrect import of constants for API key IDs
// import {
//   THEGAMESDB_API_KEY_ID,
//   GEMINI_API_KEY_ID,
//   RAWG_API_KEY_ID,
//   GITHUB_PAT_TOKEN_ID
// } from '../constants';

interface ApiKeysViewProps {
  // apiKeys: ApiKeyEntry[]; // Props no longer passed, fetched internally
  // onUpdateApiKey: (apiKey: ApiKeyEntry) => void; // Props no longer passed
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

export const ApiKeysView: React.FC<ApiKeysViewProps> = (
  // { apiKeys: initialApiKeys, onUpdateApiKey: onUpdateApiKeyProp } // Props removed
) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/env/keys');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for /api/env/keys`);
        }
        const loadedKeys = await response.json();
        const formattedApiKeys = Object.entries(loadedKeys).map(([key, value]) => ({
          id: key,
          serviceName: key, // Assuming serviceName is the same as the key for now
          apiKey: value as string,
        }));
        setApiKeys(formattedApiKeys);
      } catch (err) {
        console.error("Could not load API keys from server:", err);
        setError(err instanceof Error ? err.message : 'Failed to load API keys');
        setApiKeys([]); // Set to empty array on error to prevent null issues later
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKeys();
  }, []);

  const handleUpdateApiKey = (updatedApiKey: ApiKeyEntry) => {
    setApiKeys(prevKeys => {
      if (!prevKeys) return null; // Should not happen if initialized to [] on error
      const newKeys = prevKeys.map(key => key.id === updatedApiKey.id ? updatedApiKey : key);

      const keysToSave = newKeys.reduce((acc, key) => {
        acc[key.id] = key.apiKey;
        return acc;
      }, {} as Record<string, string>);

      fetch('/api/env/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keysToSave),
      })
      .then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error during save." }));
          throw new Error(`Failed to save API keys: ${response.status} ${response.statusText}. ${errorData.message || errorData.error || ''}`);
        }
        return response.json();
      })
      .then(result => {
        console.log(`API keys saved successfully:`, result.message);
        // Optionally, you can show a notification to the user to restart the server.
      })
      .catch(err => {
        console.error(`Error saving API keys:`, err);
        setError(err instanceof Error ? err.message : 'Failed to save API keys');
      });

      return newKeys;
    });
  };

  const handleSave = (key: string, value: string) => {
    // Find the serviceName from the existing keys or use the key itself if not found (should always be found)
    const serviceName = apiKeys?.find(k => k.id === key)?.serviceName || key;
    handleUpdateApiKey({ id: key, serviceName: serviceName, apiKey: value });
  };

  const getKey = (id: string) => apiKeys?.find(k => k.id === id)?.apiKey || '';

  if (isLoading) {
    return (
      <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in text-center text-neutral-500">
            <KeyIcon className="w-20 h-20 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-semibold">Loading API Key Settings...</h3>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in text-center text-red-400">
            <KeyIcon className="w-20 h-20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Error Loading API Keys</h3>
            <p>{error}</p>
        </div>
    );
  }

  if (!apiKeys) { // Should ideally not be hit if initialized to [] on error and loading handles null
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