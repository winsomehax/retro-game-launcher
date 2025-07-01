import React, { useState, useEffect, useCallback } from 'react';
import { EmulatorConfig } from '../types';
import { Button } from '../components/Button';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { EmulatorConfigForm } from '../components/EmulatorConfigForm';

export const EmulatorsView: React.FC = () => {
  const [emulators, setEmulators] = useState<EmulatorConfig[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmulator, setEditingEmulator] = useState<EmulatorConfig | null>(null);

  useEffect(() => {
    fetch('/api/data/emulators')
      .then(response => response.json())
      .then(data => setEmulators(data))
      .catch(error => console.error('Could not load emulators:', error));
  }, []);

  const saveData = useCallback((data: EmulatorConfig[]) => {
    fetch('/api/data/emulators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(error => console.error('Could not save emulators:', error));
  }, []);

  const handleAddEmulator = () => {
    setEditingEmulator(null);
    setIsFormOpen(true);
  };

  const handleEditEmulator = (emulator: EmulatorConfig) => {
    setEditingEmulator(emulator);
    setIsFormOpen(true);
  };

  const handleDeleteEmulator = (emulatorId: string) => {
    if (confirm('Are you sure you want to delete this emulator?')) {
      const newEmulators = emulators.filter(e => e.id !== emulatorId);
      setEmulators(newEmulators);
      saveData(newEmulators);
    }
  };

  const handleSubmitForm = (emulator: EmulatorConfig) => {
    let newEmulators;
    if (editingEmulator) {
      newEmulators = emulators.map(e => e.id === emulator.id ? emulator : e);
    } else {
      newEmulators = [...emulators, { ...emulator, id: crypto.randomUUID() }];
    }
    setEmulators(newEmulators);
    saveData(newEmulators);
    setIsFormOpen(false);
  };

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Emulator Library</h1>
        <Button onClick={handleAddEmulator} leftIcon={<PlusIcon />} variant="primary">
          Add Emulator
        </Button>
      </header>
      <div className="space-y-4">
        {emulators.map(emulator => (
          <div key={emulator.id} className="bg-neutral-800 p-4 rounded-lg flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{emulator.name}</h2>
              <p className="text-sm text-neutral-400">{emulator.executablePath}</p>
              <p className="text-xs text-neutral-500">{emulator.args}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => handleEditEmulator(emulator)}>
                <EditIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteEmulator(emulator.id)}>
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <EmulatorConfigForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitForm}
        initialConfig={editingEmulator}
      />
    </div>
  );
};