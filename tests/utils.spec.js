const path = require('path');

describe('Utility Functions', () => {
  describe('Asset path handling', () => {
    it('should handle asset paths correctly', () => {
      // Test asset path logic
      const assetPath = '/path/to/asset.jpg';
      const isUrl = (path) => path.startsWith('http');
      const isLocalPath = (path) => !isUrl(path) && path.length > 0;
      
      expect(isUrl(assetPath)).toBe(false);
      expect(isLocalPath(assetPath)).toBe(true);
      
      const urlPath = 'http://example.com/asset.jpg';
      expect(isUrl(urlPath)).toBe(true);
      expect(isLocalPath(urlPath)).toBe(false);
    });
  });

  describe('String sanitization', () => {
    it('should sanitize strings for logging', () => {
      // Test sanitization logic
      const sanitizeForLog = (str) => {
        if (typeof str !== 'string') return String(str);
        return str.replace(/[\x00-\x1F\x7F]/g, '');
      };
      
      const cleanString = 'Clean string';
      const sanitizedClean = sanitizeForLog(cleanString);
      expect(sanitizedClean).toBe('Clean string');
      
      const dirtyString = 'Dirty\x00string\x7Fwith\x1Fcontrol characters';
      const sanitizedDirty = sanitizeForLog(dirtyString);
      expect(sanitizedDirty).toBe('Dirtystringwithcontrol characters');
    });
  });

  describe('UUID generation', () => {
    it('should generate valid UUIDs', () => {
      const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });
});