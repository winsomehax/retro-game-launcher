
import React, { useState } from 'react';
import { ApiKeyEntry } from '../types';
import { Button } from '../components/Button';
import { EditIcon, KeyIcon } from '../components/Icons';
import { ApiKeyForm } from '../components/ApiKeyForm';

interface ApiKeysViewProps {
  apiKeys: [ApiKeyEntry, ApiKeyEntry]; // Expects exactly two ApiKeyEntry objects
  onUpdateApiKey: (apiKey: ApiKeyEntry) => void;
}

const maskApiKey = (key: string) => {
  if (!key) return 'Not Set';
  if (key.length <= 8) return '••••••••';
  return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
};

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({
  apiKeys,
  onUpdateApiKey,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyEntry | null>(null);

  console.log('ApiKeysView rendered. isFormOpen:', isFormOpen, 'editingKey:', editingKey ? editingKey.serviceName : null);

  const handleEditKey = (apiKey: ApiKeyEntry) => {
    console.log('handleEditKey called with:', apiKey);
    setEditingKey(apiKey);
    setIsFormOpen(true);
  };

  const handleSubmitForm = (apiKey: ApiKeyEntry) => {
    onUpdateApiKey(apiKey);
    setIsFormOpen(false);
    setEditingKey(null);
  };

  if (!apiKeys || apiKeys.length !== 2) {
    console.error('ApiKeysView: apiKeys prop is invalid or not loaded.', apiKeys);
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
          <p className="text-neutral-400 text-sm">Configure API keys for TheGamesDB and Gemini API.</p>
        </div>
      </header>

      <div className="bg-neutral-800 p-6 rounded-lg shadow-xl">
        {apiKeys.length > 0 ? ( 
          <ul className="space-y-4">
            {apiKeys.map((keyEntry) => (
              <li 
                key={keyEntry.id} 
                className="bg-neutral-700 p-4 rounded-md shadow flex flex-col sm:flex-row justify-between sm:items-center hover:bg-neutral-600/70 transition-colors"
                aria-labelledby={`service-name-${keyEntry.id}`}
              >
                <div className="mb-2 sm:mb-0">
                  <p id={`service-name-${keyEntry.id}`} className="font-medium text-lg text-neutral-100">{keyEntry.serviceName}</p>
                  <p className="text-sm text-neutral-400 font-mono" title={keyEntry.apiKey || 'Not Set'}>
                    Key: {maskApiKey(keyEntry.apiKey)}
                  </p>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      console.log('Edit button clicked for:', keyEntry.serviceName, keyEntry);
                      handleEditKey(keyEntry);
                    }} 
                    aria-label={`Edit API key for ${keyEntry.serviceName}`}
                  >
                    <EditIcon className="text-neutral-400 hover:text-primary-light"/>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <KeyIcon className="w-20 h-20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">API Key settings not available.</h3>
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg text-center text-sm text-neutral-400">
        <p><strong>Note:</strong> API key modifications are saved in your browser's local storage and will persist for your next session on this computer.</p>
        <p>These changes do not update the master <code>data/keys.json</code> file on the server. The <code>data/keys.json</code> file provides initial default values if no keys are found in local storage.</p>
      </div>

      {editingKey && (
        <ApiKeyForm
          isOpen={isFormOpen}
          onClose={() => {
            console.log('Closing ApiKeyForm modal.');
            setIsFormOpen(false);
            setEditingKey(null); // Explicitly nullify editingKey on close
          }}
          onSubmit={handleSubmitForm}
          initialKey={editingKey} 
        />
      )}
    </div>
  );
};
