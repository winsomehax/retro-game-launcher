beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

// Load environment variables
require('dotenv').config({ path: '.env' });

const GameService = require('../js/GameService');

// Mock the ScreenScraperAPI
jest.mock('../js/screenscraperAPI');

describe('GameService', () => {
  let gameService;
  const mockUser = process.env.SCREENSCRAPER_DEVID || 'Motor1024';
  const mockPassword = process.env.SCREENSCRAPER_DEV_PASSWORD || 'QPpIpcSkR2p';

  beforeEach(() => {
    gameService = new GameService(mockUser, mockPassword);
  });

  describe('constructor', () => {
    it('should create a GameService instance with ScreenScraperAPI', () => {
      expect(gameService).toBeInstanceOf(GameService);
      expect(gameService.ssAPI).toBeDefined();
    });
  });

  describe('getGameOverview', () => {
    it('should return null when no games are found', async () => {
      // Mock the searchGameByName to return no results
      gameService.ssAPI.searchGameByName.mockResolvedValue({
        response: {
          jeux: []
        }
      });

      const result = await gameService.getGameOverview('NonExistentGame');
      expect(result).toBeNull();
    });

    it('should return game details when game is found', async () => {
      // Mock the search response
      gameService.ssAPI.searchGameByName.mockResolvedValue({
        response: {
          jeux: [{
            id: 123,
            nom: 'Test Game'
          }]
        }
      });

      // Mock the game info response
      gameService.ssAPI.getGameInfo.mockResolvedValue({
        response: {
          jeux: [{
            id: 123,
            noms: [{ text: 'Test Game', region: 'us' }],
            synopsis: [{ text: 'A test game', langue: 'en' }],
            genres: [{ noms: [{ text: 'Action', langue: 'en' }] }],
            dates: [{ text: '1990' }],
            developpeur: { text: 'Test Developer' },
            editeur: { text: 'Test Publisher' },
            joueurs: { text: '1-2' },
            note: '4.5',
            systeme: { id: 1, text: 'NES' },
            medias: [
              { type: 'box-2D', url: 'http://example.com/boxart.jpg' },
              { type: 'ss', url: 'http://example.com/screenshot.jpg' }
            ]
          }]
        }
      });

      const result = await gameService.getGameOverview('Test Game');
      
      expect(result).toEqual({
        id: 123,
        title: 'Test Game',
        names: [{ text: 'Test Game', region: 'us' }],
        regions: undefined,
        dates: [{ text: '1990' }],
        developers: 'Test Developer',
        publishers: 'Test Publisher',
        genres: 'Action',
        players: '1-2',
        rating: '4.5',
        description: 'A test game',
        system: { id: 1, text: 'NES' },
        media: {
          boxArt: 'http://example.com/boxart.jpg',
          screenshot: 'http://example.com/screenshot.jpg'
        }
      });
    });

    it('should handle errors gracefully', async () => {
      gameService.ssAPI.searchGameByName.mockRejectedValue(new Error('API Error'));
      
      await expect(gameService.getGameOverview('Test Game')).rejects.toThrow('API Error');
    });
  });

  describe('downloadGameAsset', () => {
    it('should call ScreenScraperAPI downloadGameMedia', async () => {
      gameService.ssAPI.downloadGameMedia.mockResolvedValue('http://example.com/asset.jpg');
      
      const result = await gameService.downloadGameAsset(123, 'box-2D');
      
      expect(gameService.ssAPI.downloadGameMedia).toHaveBeenCalledWith(123, 'box-2D');
      expect(result).toBe('http://example.com/asset.jpg');
    });
  });
});