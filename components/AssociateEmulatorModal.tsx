import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { EmulatorConfig } from '../types';

interface AssociateEmulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  platformId: number;
  associatedEmulatorIds: string[];
  allEmulators: EmulatorConfig[];
  onSubmit: (platformId: number, selectedEmulatorIds: string[]) => void;
}

export const AssociateEmulatorModal: React.FC<AssociateEmulatorModalProps> = ({
  isOpen,
  onClose,
  platformId,
  associatedEmulatorIds,
  allEmulators,
  onSubmit,
}) => {
  const [selectedEmulators, setSelectedEmulators] = useState<string[]>(associatedEmulatorIds);

  useEffect(() => {
    setSelectedEmulators(associatedEmulatorIds);
  }, [associatedEmulatorIds]);

  const handleCheckboxChange = (emulatorId: string) => {
    setSelectedEmulators(prev =>
      prev.includes(emulatorId) ? prev.filter(id => id !== emulatorId) : [...prev, emulatorId]
    );
  };

  const handleSubmit = () => {
    onSubmit(platformId, selectedEmulators);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Associate Emulators"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Save Associations</Button>
        </>
      }
    >
      <div className="space-y-3">
        {allEmulators.length === 0 && (
          <p className="text-neutral-500">No emulators found. Please add emulators in the Emulators section first.</p>
        )}
        {allEmulators.map(emulator => (
          <div key={emulator.id} className="flex items-center bg-neutral-700 p-3 rounded-md">
            <input
              type="checkbox"
              id={`emulator-${emulator.id}`}
              checked={selectedEmulators.includes(emulator.id)}
              onChange={() => handleCheckboxChange(emulator.id)}
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary-light"
            />
            <label htmlFor={`emulator-${emulator.id}`} className="ml-3 text-neutral-100">
              {emulator.name} (<span className="text-neutral-400 text-sm">{emulator.executablePath}</span>)
            </label>
          </div>
        ))}
      </div>
    </Modal>
  );
};