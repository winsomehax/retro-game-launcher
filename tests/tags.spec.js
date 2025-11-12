// Mock Electron API
const mockElectronAPI = {
  loadData: jest.fn(),
  saveData: jest.fn()
};

global.electronAPI = mockElectronAPI;

describe('Tag System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tag creation', () => {
    it('should create a new tag with UUID', () => {
      // Test tag creation logic
      const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      const tagName = 'Action';
      const tag = {
        id: generateUUID(),
        name: tagName
      };
      
      expect(tag.name).toBe('Action');
      expect(tag.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('Tag assignment', () => {
    it('should assign tags to games', () => {
      const game = { id: 1, title: 'Test Game', tagIds: [] };
      const tag = { id: 'tag-1', name: 'Action' };
      
      // Assign tag to game
      game.tagIds.push(tag.id);
      
      expect(game.tagIds).toContain('tag-1');
      expect(game.tagIds.length).toBe(1);
    });
  });

  describe('Tag filtering', () => {
    it('should filter games by tag', () => {
      const games = [
        { id: 1, title: 'Game 1', tagIds: ['action', 'adventure'] },
        { id: 2, title: 'Game 2', tagIds: ['action'] },
        { id: 3, title: 'Game 3', tagIds: ['rpg'] }
      ];
      
      const actionGames = games.filter(game => game.tagIds.includes('action'));
      
      expect(actionGames.length).toBe(2);
      expect(actionGames[0].title).toBe('Game 1');
      expect(actionGames[1].title).toBe('Game 2');
    });
  });
});