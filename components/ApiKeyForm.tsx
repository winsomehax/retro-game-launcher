
import React, { useState, useEffect } from 'react';
import { ApiKeyEntry } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Modal } from './Modal';
import { EyeIcon, EyeSlashIcon } from './Icons';

interface ApiKeyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKeyEntry: ApiKeyEntry) => void;
  initialKey: ApiKeyEntry; // Changed to non-nullable, as it's always an edit
}

export const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ isOpen, onClose, onSubmit, initialKey }) => {
  // Use only the apiKey part for the editable state, serviceName and id come from initialKey
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    if (initialKey) {
      setCurrentApiKey(initialKey.apiKey || ''); // Ensure it's a string
    }
    setIsKeyVisible(false); // Reset visibility on open/change of initialKey
  }, [initialKey, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentApiKey(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedKeyData: ApiKeyEntry = {
      ...initialKey, // This includes the correct id and serviceName
      apiKey: currentApiKey,
    };
    onSubmit(updatedKeyData);
  };

  if (!initialKey) return null; // Should not happen if used correctly from ApiKeysView

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Edit API Key for ${initialKey.serviceName}`}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" form="api-key-form" variant="primary">
                    Save Changes
                </Button>
            </>
        }
    >
      <form id="api-key-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Service Name</label>
            <p className="w-full px-4 py-2.5 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg shadow-sm">
                {initialKey.serviceName}
            </p>
        </div>
        
        <div className="relative">
          <Input
            label="API Key"
            name="apiKey" // Name attribute is still useful for general Input component
            type={isKeyVisible ? 'text' : 'password'}
            value={currentApiKey}
            onChange={handleChange}
            // No 'required' prop, as an empty string is a valid way to "clear" the key
            placeholder="Enter API Key (leave blank to clear)"
            containerClassName="!mb-0" // Remove bottom margin from Input's container
          />
          <button
            type="button"
            onClick={() => setIsKeyVisible(!isKeyVisible)}
            className="absolute right-3 top-[calc(1.75rem+0.625rem)] transform -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label={isKeyVisible ? 'Hide API Key' : 'Show API Key'}
            tabIndex={-1} // Improve tab order, focus handled by Input
          >
            {isKeyVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
         <p className="text-xs text-neutral-400">API keys are sensitive. Ensure you trust this application with your keys.</p>
      </form>
    </Modal>
  );
};
