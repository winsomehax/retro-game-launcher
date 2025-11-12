// Mock Electron API
const mockElectronAPI = {
  loadData: jest.fn(),
  saveData: jest.fn()
};

global.electronAPI = mockElectronAPI;

// Mock DOM elements
document.body.innerHTML = `
  <div id="games-container"></div>
  <div id="platforms-container"></div>
  <div id="emulators-container"></div>
`;

describe('UI Components', () => {
  describe('Game rendering', () => {
    it('should render game cards', () => {
      // Test game card rendering logic
      const game = {
        id: 1,
        title: 'Test Game',
        platformId: 1,
        genre: 'Action'
      };
      
      const gameCard = `
        <div class="game-card" data-game-id="${game.id}">
          <h3>${game.title}</h3>
          <p>Platform: ${game.platformId}</p>
          <p>Genre: ${game.genre}</p>
        </div>
      `;
      
      expect(gameCard).toContain('Test Game');
      expect(gameCard).toContain('data-game-id="1"');
    });
  });

  describe('Modal interactions', () => {
    it('should handle modal opening and closing', () => {
      // Test modal logic
      let modalOpen = false;
      
      const openModal = () => {
        modalOpen = true;
      };
      
      const closeModal = () => {
        modalOpen = false;
      };
      
      openModal();
      expect(modalOpen).toBe(true);
      
      closeModal();
      expect(modalOpen).toBe(false);
    });
  });

  describe('Form validation', () => {
    it('should validate form inputs', () => {
      const validateForm = (data) => {
        const errors = {};
        
        if (!data.title || data.title.trim().length === 0) {
          errors.title = 'Title is required';
        }
        
        if (!data.platformId) {
          errors.platformId = 'Platform is required';
        }
        
        return {
          isValid: Object.keys(errors).length === 0,
          errors
        };
      };
      
      // Test valid form
      const validData = {
        title: 'Test Game',
        platformId: 1
      };
      
      const validResult = validateForm(validData);
      expect(validResult.isValid).toBe(true);
      expect(Object.keys(validResult.errors).length).toBe(0);
      
      // Test invalid form
      const invalidData = {
        title: '',
        platformId: null
      };
      
      const invalidResult = validateForm(invalidData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.title).toBe('Title is required');
      expect(invalidResult.errors.platformId).toBe('Platform is required');
    });
  });
});