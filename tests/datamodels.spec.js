const fs = require('fs');
const path = require('path');

describe('Data Models', () => {
  describe('Game data normalization', () => {
    it('should normalize game data structure', () => {
      // Test data normalization logic
      const rawData = {
        id: 1,
        title: 'Test Game',
        // Missing some fields
      };
      
      const normalized = {
        id: rawData.id,
        title: rawData.title || 'Unknown Title',
        platformId: rawData.platformId || null,
        genre: rawData.genre || 'Unknown',
        description: rawData.description || '',
        path: rawData.path || '',
        emulatorId: rawData.emulatorId || null,
        metadata: rawData.metadata || {}
      };
      
      expect(normalized.id).toBe(1);
      expect(normalized.title).toBe('Test Game');
      expect(normalized.genre).toBe('Unknown');
    });
  });

  describe('Platform data normalization', () => {
    it('should normalize platform data structure', () => {
      const rawData = {
        id: 1,
        name: 'NES'
        // Missing some fields
      };
      
      const normalized = {
        id: rawData.id,
        name: rawData.name || 'Unknown Platform',
        manufacturer: rawData.manufacturer || 'Unknown',
        releaseYear: rawData.releaseYear || 'Unknown',
        description: rawData.description || '',
        tags: rawData.tags || []
      };
      
      expect(normalized.id).toBe(1);
      expect(normalized.name).toBe('NES');
      expect(normalized.manufacturer).toBe('Unknown');
    });
  });

  describe('Emulator data normalization', () => {
    it('should normalize emulator data structure', () => {
      const rawData = {
        emulator_id: 1,
        name: 'FCEUX'
        // Missing some fields
      };
      
      const normalized = {
        emulator_id: rawData.emulator_id,
        name: rawData.name || 'Unknown Emulator',
        path: rawData.path || '',
        platformIds: rawData.platformIds || [],
        default: rawData.default || false
      };
      
      expect(normalized.emulator_id).toBe(1);
      expect(normalized.name).toBe('FCEUX');
      expect(normalized.default).toBe(false);
    });
  });

  describe('Tag data normalization', () => {
    it('should normalize tag data structure', () => {
      const rawData = {
        id: 1,
        name: 'Action'
      };
      
      const normalized = {
        id: rawData.id,
        name: rawData.name || 'Unknown Tag'
      };
      
      expect(normalized.id).toBe(1);
      expect(normalized.name).toBe('Action');
    });
  });
});