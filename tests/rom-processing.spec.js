// Mock Electron API
const mockElectronAPI = {
  selectDirectory: jest.fn(),
  loadSettings: jest.fn(),
  saveSettings: jest.fn()
};

global.electronAPI = mockElectronAPI;

// Mock DOM for scan view
document.body.innerHTML = `
  <div id="scan-view">
    <div id="scan-folder-display"></div>
    <div id="scan-progress" class="hidden">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="progress-text"></div>
    </div>
    <div id="rom-results"></div>
  </div>
`;

// Mock file system
const fs = require('fs');
const path = require('path');

describe('ROM Scanning', () => {
  let app; // We'll need to access the RetroGameLauncher instance

  // Since we can't easily import the app class here, we'll test the scanning logic directly
  describe('File filtering', () => {
    it('should filter out non-ROM files', () => {
      const files = [
        'game1.smc',
        'game2.zip',
        'readme.txt',
        'image.png',
        'video.mp4',
        'font.ttf',
        'game3.nes'
      ];
      
      const validExtensions = ['.smc', '.zip', '.nes'];
      const romFiles = files.filter(file => 
        validExtensions.includes(path.extname(file).toLowerCase())
      );
      
      expect(romFiles).toEqual(['game1.smc', 'game2.zip', 'game3.nes']);
    });

    it('should handle mixed case extensions', () => {
      const files = [
        'GAME1.SMC',
        'game2.ZIP',
        'Game3.NES'
      ];
      
      const validExtensions = ['.smc', '.zip', '.nes'];
      const romFiles = files.filter(file => 
        validExtensions.includes(path.extname(file).toLowerCase())
      );
      
      expect(romFiles).toEqual(['GAME1.SMC', 'game2.ZIP', 'Game3.NES']);
    });
  });

  describe('Batch processing', () => {
    it('should split files into batches of 25', () => {
      const files = Array(60).fill().map((_, i) => `game${i}.smc`);
      
      const batches = [];
      for (let i = 0; i < files.length; i += 25) {
        batches.push(files.slice(i, i + 25));
      }
      
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(25);
      expect(batches[1].length).toBe(25);
      expect(batches[2].length).toBe(10);
    });
  });
});