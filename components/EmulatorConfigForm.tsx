
import React, { useState, useEffect } from 'react';
import { EmulatorConfig } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Modal } from './Modal';

interface EmulatorConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (emulatorConfig: EmulatorConfig) => void;
  initialConfig?: EmulatorConfig | null;
  platformName: string;
}

const defaultConfig: Omit<EmulatorConfig, 'id'> = {
  name: '',
  executablePath: '',
  args: '',
};

export const EmulatorConfigForm: React.FC<EmulatorConfigFormProps> = ({ isOpen, onClose, onSubmit, initialConfig, platformName }) => {
  const [configData, setConfigData] = useState<Omit<EmulatorConfig, 'id'>>(initialConfig || defaultConfig);

  useEffect(() => {
    if (initialConfig) {
      setConfigData(initialConfig);
    } else {
      setConfigData(defaultConfig);
    }
  }, [initialConfig, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfigData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullConfigData: EmulatorConfig = {
      ...configData,
      id: initialConfig?.id || crypto.randomUUID(),
    };
    onSubmit(fullConfigData);
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${initialConfig ? 'Edit' : 'Add'} Emulator for ${platformName}`}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" form="emulator-config-form" variant="primary">
                    {initialConfig ? 'Save Changes' : 'Add Emulator'}
                </Button>
            </>
        }
    >
      <form id="emulator-config-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Emulator Name" name="name" value={configData.name} onChange={handleChange} required placeholder="e.g., VICE x64, Snes9x" />
        <Input label="Executable Path" name="executablePath" value={configData.executablePath} onChange={handleChange} required placeholder="e.g., /usr/bin/vice or C:\\Emulators\\snes9x.exe" />
        <Input label="Command-line Arguments" name="args" value={configData.args} onChange={handleChange} placeholder="e.g., -fullscreen {romPath}" />
        <p className="text-xs text-neutral-400">
          Use <code className="bg-neutral-700 px-1 rounded">{`{romPath}`}</code> as a placeholder for the full ROM file path. <br />
          Use <code className="bg-neutral-700 px-1 rounded">{`{emulatorPath}`}</code> as a placeholder for the emulator's executable path if needed in complex argument structures (often not required if the path is launched directly).
        </p>
      </form>
    </Modal>
  );
};
    