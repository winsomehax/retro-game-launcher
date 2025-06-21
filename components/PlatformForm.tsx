
import React, { useState, useEffect } from 'react';
import { Platform } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Modal } from './Modal';

interface PlatformFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (platform: Omit<Platform, 'emulators'>) => void;
  initialPlatform?: Omit<Platform, 'emulators'> | null;
}

const defaultPlatform: Omit<Platform, 'id' | 'emulators'> = {
  name: '',
  iconUrl: '',
};

export const PlatformForm: React.FC<PlatformFormProps> = ({ isOpen, onClose, onSubmit, initialPlatform }) => {
  const [platformData, setPlatformData] = useState<Omit<Platform, 'id' | 'emulators'>>(initialPlatform || defaultPlatform);

  useEffect(() => {
    if (initialPlatform) {
      setPlatformData({ name: initialPlatform.name, iconUrl: initialPlatform.iconUrl });
    } else {
      setPlatformData(defaultPlatform);
    }
  }, [initialPlatform, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPlatformData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPlatformData: Omit<Platform, 'emulators'> = {
      ...platformData,
      id: initialPlatform?.id || crypto.randomUUID(),
    };
    onSubmit(fullPlatformData);
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialPlatform ? 'Edit Platform' : 'Add New Platform'}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" form="platform-form" variant="primary">
                    {initialPlatform ? 'Save Changes' : 'Add Platform'}
                </Button>
            </>
        }
    >
      <form id="platform-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Platform Name" name="name" value={platformData.name} onChange={handleChange} required />
        <Input label="Icon URL (Optional)" name="iconUrl" value={platformData.iconUrl || ''} onChange={handleChange} placeholder="https://example.com/icon.png"/>
      </form>
    </Modal>
  );
};
    