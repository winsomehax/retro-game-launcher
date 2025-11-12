
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});


// Load environment variables
require('dotenv').config({ path: '.env' });

const ScreenScraperAPI = require('../js/screenscraperAPI');

// Mock fetch globally
global.fetch = jest.fn();

describe('ScreenScraperAPI', () => {
  const mockUser = process.env.SCREENSCRAPER_DEVID || 'Motor1024';
  const mockPassword = process.env.SCREENSCRAPER_DEV_PASSWORD || 'QPpIpcSkR2p';
  let api;

  beforeEach(() => {
    api = new ScreenScraperAPI(mockUser, mockPassword);
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should create an instance with valid credentials', () => {
      expect(api).toBeInstanceOf(ScreenScraperAPI);
    });

    it('should throw error when username is missing', () => {
      expect(() => new ScreenScraperAPI(null, mockPassword)).toThrow('Username and password are required');
    });

    it('should throw error when password is missing', () => {
      expect(() => new ScreenScraperAPI(mockUser, null)).toThrow('Username and password are required');
    });
  });

  describe('API methods', () => {
    const mockResponse = {
      status: 'success',
      data: 'test data'
    };

    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
        status: 200,
        statusText: 'OK'
      });
    });

    it('should call getInfrastructureInfo endpoint', async () => {
      const result = await api.getInfrastructureInfo();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ssinfraInfos.php'));
      expect(result).toEqual(mockResponse);
    });

    it('should call getUserInfo endpoint', async () => {
      const result = await api.getUserInfo();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ssuserInfos.php'));
      expect(result).toEqual(mockResponse);
    });

    it('should call searchGameByName endpoint with parameters', async () => {
      const result = await api.searchGameByName('Test Game', 1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('jeuRecherche.php'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('recherche=Test+Game'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('systemeid=1'));
      expect(result).toEqual(mockResponse);
    });

    it('should call getGameInfo endpoint with parameters', async () => {
      const result = await api.getGameInfo(123);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('jeuInfos.php'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('gameid=123'));
      expect(result).toEqual(mockResponse);
    });

    it('should handle authentication errors', async () => {
      fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('Erreur de login'),
        status: 200
      });

      await expect(api.getUserInfo()).rejects.toThrow('Authentication failed: Invalid ScreenScraper credentials');
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Not Found'),
        status: 404,
        statusText: 'Not Found'
      });

      await expect(api.getUserInfo()).rejects.toThrow('HTTP error! Status: 404 - Not Found');
    });
  });
});