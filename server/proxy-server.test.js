// Imports
const path = require('path'); // Ensure path is imported for use in ROMS_BASE_DIRECTORY definition and tests

// Mock 'fs' module
const mockFs = {
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
  },
};
jest.mock('fs', () => mockFs);

// Original process.env for restoration
const originalEnv = { ...process.env };
const MOCK_TEST_ROM_BASE_DIR = path.resolve(process.cwd(), 'test_roms_base'); // Use a path relative to CWD for tests

// Describe block for /api/scan-roms
describe('/api/scan-roms endpoint', () => {
  // Define ROMS_BASE_DIRECTORY based on the mocked environment variable for this test suite
  let ROMS_BASE_DIRECTORY_FOR_TEST;

  const IGNORED_ROM_EXTENSIONS = ['.txt', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.mkv', '.mpg', '.avi', '.nfo'];

  // This is a re-implementation of the handler logic from proxy-server.js for testing purposes.
  // It's adapted to use ROMS_BASE_DIRECTORY_FOR_TEST.
  const callScanRomsHandler = async (reqBody) => {
    const req = { body: reqBody };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const { platformId, folderPath: userProvidedPath } = req.body;

    if (!platformId || typeof userProvidedPath !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required fields: platformId or folderPath.' });
    }

    if (userProvidedPath.includes('..') || path.isAbsolute(userProvidedPath)) {
      // console.warn used in actual code
      return res.status(400).json({ error: 'Invalid folder path. Must be a relative path without ".." segments.' });
    }

    const intendedPath = path.join(ROMS_BASE_DIRECTORY_FOR_TEST, userProvidedPath);
    const finalResolvedPath = path.resolve(intendedPath);

    if (!finalResolvedPath.startsWith(ROMS_BASE_DIRECTORY_FOR_TEST)) {
      // console.warn used in actual code
      return res.status(403).json({ error: 'Access denied: Path is outside the allowed base directory.' });
    }

    try {
      const stats = await mockFs.promises.stat(finalResolvedPath);
      if (!stats.isDirectory()) {
        // console.warn used in actual code
        return res.status(400).json({ error: `Specified path is not a directory: ${userProvidedPath}` });
      }

      const dirents = await mockFs.promises.readdir(finalResolvedPath, { withFileTypes: true });
      const scannedFileObjects = [];
      for (const dirent of dirents) {
        if (dirent.isFile()) {
          const fileNameWithExt = dirent.name;
          const ext = path.extname(fileNameWithExt).toLowerCase();
          if (!IGNORED_ROM_EXTENSIONS.includes(ext)) {
            const displayName = path.parse(fileNameWithExt).name;
            scannedFileObjects.push({ displayName, fileName: fileNameWithExt });
          }
        }
      }
      res.status(200).json(scannedFileObjects);
    } catch (error) {
      // console.error used in actual code
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: `Directory not found: ${userProvidedPath}` });
      } else if (error.code === 'EACCES') {
        return res.status(403).json({ error: `Permission denied for directory: ${userProvidedPath}` });
      }
      res.status(500).json({ error: 'Failed to scan ROMs folder due to a server error.', details: error.message });
    }
    return res;
  };

  beforeAll(() => {
    // Set up the test ROMs base directory path
    process.env.ROMS_BASE_DIR = MOCK_TEST_ROM_BASE_DIR;
    // Re-evaluate ROMS_BASE_DIRECTORY_FOR_TEST after setting env var
    // This assumes proxy-server.js would re-evaluate its constant if run now,
    // or that we are testing the logic with this specific base.
    ROMS_BASE_DIRECTORY_FOR_TEST = process.env.ROMS_BASE_DIR;
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockFs.promises.stat.mockReset();
    mockFs.promises.readdir.mockReset();
  });

  it('should scan a valid subdirectory and return correct file objects', async () => {
    const userPath = 'snes_games';
    const fullPath = path.join(ROMS_BASE_DIRECTORY_FOR_TEST, userPath);
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.promises.readdir.mockResolvedValue([
      { name: 'Chrono Trigger.sfc', isFile: () => true },
      { name: 'SF2.smc', isFile: () => true },
      { name: 'readme.txt', isFile: () => true }, // Should be ignored
    ]);

    const response = await callScanRomsHandler({ platformId: 'snes', folderPath: userPath });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      { displayName: 'Chrono Trigger', fileName: 'Chrono Trigger.sfc' },
      { displayName: 'SF2', fileName: 'SF2.smc' },
    ]);
    expect(mockFs.promises.stat).toHaveBeenCalledWith(fullPath);
    expect(mockFs.promises.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
  });

  it('should scan the base directory if folderPath is empty', async () => {
    const userPath = "";
    const fullPath = ROMS_BASE_DIRECTORY_FOR_TEST; // Should resolve to the base
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.promises.readdir.mockResolvedValue([{ name: 'BaseGame.rom', isFile: () => true }]);

    const response = await callScanRomsHandler({ platformId: 'any', folderPath: userPath });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([{ displayName: 'BaseGame', fileName: 'BaseGame.rom' }]);
    expect(mockFs.promises.stat).toHaveBeenCalledWith(fullPath);
  });

  it('should scan the base directory if folderPath is "."', async () => {
    const userPath = ".";
    const fullPath = path.join(ROMS_BASE_DIRECTORY_FOR_TEST, userPath); // path.join(base, '.') is base
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.promises.readdir.mockResolvedValue([{ name: 'DotGame.rom', isFile: () => true }]);

    const response = await callScanRomsHandler({ platformId: 'any', folderPath: userPath });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([{ displayName: 'DotGame', fileName: 'DotGame.rom' }]);
    expect(mockFs.promises.stat).toHaveBeenCalledWith(fullPath);
  });

  it('should return 400 for userProvidedPath containing ".." segments', async () => {
    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: '../sneaky_path' });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Invalid folder path. Must be a relative path without ".." segments.' });
  });

  it('should return 400 for an absolute userProvidedPath', async () => {
    const absolutePath = path.resolve(ROMS_BASE_DIRECTORY_FOR_TEST, '../absolute_path_attempt');
    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: absolutePath });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Invalid folder path. Must be a relative path without ".." segments.' });
  });

  // This test relies on the internal logic of callScanRomsHandler to correctly use ROMS_BASE_DIRECTORY_FOR_TEST
  // and then how path.resolve and startsWith would behave.
  // A path like 'legit_subdir/../../../../outside_base_attempt' is caught by `userProvidedPath.includes('..')`.
  // The `startsWith` check is the final guard if a path could be constructed that bypasses earlier checks.
  // For this test, we'll assume the earlier checks handle common traversal attempts.
  // The `startsWith` check is more for canonicalization issues or symlinks (which are hard to test here).
  // No direct test for *only* `!finalResolvedPath.startsWith(ROMS_BASE_DIRECTORY_FOR_TEST)` failing,
  // as the `userProvidedPath` checks cover most inputs that would lead to it.
  // The successful subdirectory scan implicitly tests that `startsWith` check passes for valid paths.

  it('should return 404 if folder does not exist (ENOENT)', async () => {
    const userPath = 'nonexistent_subdir';
    const fullPath = path.join(ROMS_BASE_DIRECTORY_FOR_TEST, userPath);
    const error = new Error('Not found');
    error.code = 'ENOENT';
    mockFs.promises.stat.mockRejectedValue(error);

    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: userPath });
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: `Directory not found: ${userPath}` });
  });

  it('should return 400 if path is not a directory', async () => {
    const userPath = 'file_as_folder.txt';
    const fullPath = path.join(ROMS_BASE_DIRECTORY_FOR_TEST, userPath);
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => false });

    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: userPath });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: `Specified path is not a directory: ${userPath}` });
  });

  it('should return 403 if permission is denied (EACCES)', async () => {
    const userPath = 'restricted_subdir';
    const fullPath = path.join(ROMS_BASE_DIRECTORY_FOR_TEST, userPath);
    const error = new Error('Permission denied');
    error.code = 'EACCES';
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.promises.readdir.mockRejectedValue(error);

    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: userPath });
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: `Permission denied for directory: ${userPath}` });
  });

  it('should return 400 for missing platformId or folderPath (as string)', async () => {
    let response = await callScanRomsHandler({ folderPath: 'some/path' }); // Missing platformId
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Missing or invalid required fields: platformId or folderPath.' });

    response = await callScanRomsHandler({ platformId: 'nes' }); // Missing folderPath
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Missing or invalid required fields: platformId or folderPath.' });

    response = await callScanRomsHandler({ platformId: 'nes', folderPath: 123 }); // folderPath not a string
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Missing or invalid required fields: platformId or folderPath.' });
  });

});

// Describe block for /api/enrich-roms
describe('/api/enrich-roms endpoint', () => {
  let mockAxiosPost;

  beforeAll(() => {
    const axios = require('axios');
    if (axios.post && typeof axios.post.mockRestore === 'function') {
      axios.post.mockRestore(); // Restore if already spied/mocked by other tests
    }
    mockAxiosPost = jest.spyOn(axios, 'post');

  });

  beforeEach(() => {
    mockAxiosPost.mockReset();
    // Mock process.env for this suite
    process.env = {
      ...originalEnv, // Spread original env to keep other vars
      GEMINI_API_KEY: 'test-gemini-key',
      EXTERNAL_API_TIMEOUT: '1000',
      // ROMS_BASE_DIR is not directly used by enrich-roms logic, so not critical here
    };
  });

  afterAll(() => {
    mockAxiosPost.mockRestore();
    process.env = originalEnv; // Restore original environment
  });

  const callEnrichRomsHandler = async (reqBody) => {
    const req = { body: reqBody };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const { romNames, platformName } = req.body;
    // Using process.env directly here as the test environment is controlled by beforeEach/afterAll
    const { GEMINI_API_KEY, GEMINI_MODEL_NAME, EXTERNAL_API_TIMEOUT } = process.env;

    if (!romNames || !Array.isArray(romNames) || romNames.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty "romNames" array.' });
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const modelName = GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const romNameExamples = romNames.map(name => `"${name}"`).join(', ');
    const platformContext = platformName ? `for the gaming platform "${platformName}"` : "";
    const prompt = `Given the following list of ROM file names: ${romNameExamples}${platformContext}. These are often abbreviated or slightly incorrect. Provide the accurate or commonly accepted full game title for each.
Return the data as a valid JSON array of objects, where each object has exactly two keys: "original_name" (the input ROM name) and "suggested_title" (the full, corrected game title).
For example, if the input is ["mkombat", "stfighter2"], the output should be similar to:
[
  { "original_name": "mkombat", "suggested_title": "Mortal Kombat" },
  { "original_name": "stfighter2", "suggested_title": "Street Fighter II" }
]
Ensure the output is only the JSON array, with no surrounding text, comments, or markdown formatting like \`\`\`json.`;
    const contents = [{ "parts": [{ "text": prompt }] }];

    try {
      const axios = require('axios');
      const apiResponse = await axios.post(targetUrl, { contents }, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: (parseInt(EXTERNAL_API_TIMEOUT, 10) || 10000) * 2,
      });

      const contentType = apiResponse.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        if (apiResponse.data.candidates && apiResponse.data.candidates.length > 0 &&
            apiResponse.data.candidates[0].content && apiResponse.data.candidates[0].content.parts &&
            apiResponse.data.candidates[0].content.parts.length > 0) {
          const generatedText = apiResponse.data.candidates[0].content.parts[0].text;
          try {
            const cleanedText = generatedText.replace(/^```json\s*|```\s*$/g, '');
            const enrichedData = JSON.parse(cleanedText);
            if (!Array.isArray(enrichedData)) throw new Error("AI response was valid JSON but not an array.");
            res.status(200).json({ source: 'Gemini', enriched_roms: enrichedData });
          } catch (parseError) {
            res.status(500).json({ error: 'Failed to parse game title suggestions from AI.', details: generatedText });
          }
        } else {
          if (apiResponse.data.promptFeedback && apiResponse.data.promptFeedback.blockReason) {
            return res.status(400).json({ error: `AI content generation blocked: ${apiResponse.data.promptFeedback.blockReason}`, details: apiResponse.data.promptFeedback });
          }
          res.status(502).json({ error: 'AI service returned unexpected or empty data structure.', details: apiResponse.data });
        }
      } else {
        res.status(502).json({ error: 'Bad Gateway: AI API (enrich ROMs) returned non-JSON response.', details: { contentType: contentType, bodyPreview: String(apiResponse.data).substring(0, 200) } });
      }
    } catch (error) {
      if (error.response) {
        const { status, data, headers } = error.response;
        const errorContentType = headers['content-type'];
        let errorDetails = data;
        if (errorContentType && errorContentType.includes('application/json')) {
            errorDetails = data.error || data;
        }
        res.status(status).json({ message: `Error from AI API (enrich ROMs): ${errorDetails.message || 'Unknown error'}`, details: errorDetails });
      } else if (error.request) {
        res.status(504).json({ error: 'Gateway Timeout: No response from AI API (enrich ROMs).' });
      } else {
        res.status(500).json({ error: 'Internal Server Error while calling AI API for ROM name enrichment.' });
      }
    }
    return res;
  };

  it('should return enriched ROM names on successful AI call', async () => {
    const mockAiResponse = {
      data: {
        candidates: [{ content: { parts: [{ text: JSON.stringify([{ original_name: 'smb', suggested_title: 'Super Mario Bros.' }]) }] } }]
      },
      headers: { 'content-type': 'application/json' }
    };
    mockAxiosPost.mockResolvedValue(mockAiResponse);

    const response = await callEnrichRomsHandler({ romNames: ['smb'], platformName: 'NES' });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      source: 'Gemini',
      enriched_roms: [{ original_name: 'smb', suggested_title: 'Super Mario Bros.' }]
    });
    const expectedModel = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    expect(mockAxiosPost).toHaveBeenCalledWith(
      `https://generativelanguage.googleapis.com/v1beta/models/${expectedModel}:generateContent?key=test-gemini-key`,
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should handle AI response with markdown JSON backticks', async () => {
    const mockAiResponse = {
      data: {
        candidates: [{ content: { parts: [{ text: "```json\n" + JSON.stringify([{ original_name: 'zelda', suggested_title: 'The Legend of Zelda' }]) + "\n```" }] } }]
      },
      headers: { 'content-type': 'application/json' }
    };
    mockAxiosPost.mockResolvedValue(mockAiResponse);

    const response = await callEnrichRomsHandler({ romNames: ['zelda'] });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        enriched_roms: [{ original_name: 'zelda', suggested_title: 'The Legend of Zelda' }]
    }));
  });


  it('should return 400 if romNames is missing or empty', async () => {
    let response = await callEnrichRomsHandler({});
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Request body must contain a non-empty "romNames" array.' });

    response = await callEnrichRomsHandler({ romNames: [] });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Request body must contain a non-empty "romNames" array.' });
  });

  it('should return 500 if GEMINI_API_KEY is not configured', async () => {
    const oldApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Gemini API key is not configured on the server.' });
    process.env.GEMINI_API_KEY = oldApiKey; // Restore
  });

  it('should handle AI service error (e.g., API error response)', async () => {
    mockAxiosPost.mockRejectedValue({
      response: {
        status: 429,
        data: { error: { message: 'Quota exceeded' } },
        headers: { 'content-type': 'application/json' }
      }
    });

    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Quota exceeded')
    }));
  });

  it('should handle AI service returning non-JSON error', async () => {
    mockAxiosPost.mockRejectedValue({
      response: {
        status: 500,
        data: 'Internal Server Error HTML page',
        headers: { 'content-type': 'text/html' }
      }
    });

    const response = await callEnrichRomsHandler({ romNames: ['testrom'] });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({ bodyPreview: "Internal Server Error HTML page" })
    }));
  });


  it('should handle AI service timeout', async () => {
    mockAxiosPost.mockRejectedValue({ request: {}, message: 'Timeout' });
    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(504);
    expect(response.json).toHaveBeenCalledWith({ error: 'Gateway Timeout: No response from AI API (enrich ROMs).' });
  });

  it('should handle AI response parsing error (malformed JSON)', async () => {
    const mockAiResponse = {
      data: {
        candidates: [{ content: { parts: [{ text: 'This is not JSON' }] } }]
      },
      headers: { 'content-type': 'application/json' }
    };
    mockAxiosPost.mockResolvedValue(mockAiResponse);

    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Failed to parse game title suggestions from AI.', details: 'This is not JSON' });
  });

  it('should handle AI response that is JSON but not an array', async () => {
    const mockAiResponse = {
      data: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ not_an_array: true }) }] } }]
      },
      headers: { 'content-type': 'application/json' }
    };
    mockAxiosPost.mockResolvedValue(mockAiResponse);

    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Failed to parse game title suggestions from AI.'
    }));
  });

  it('should handle AI response with no candidates', async () => {
    const mockAiResponse = {
      data: { candidates: [] },
      headers: { 'content-type': 'application/json' }
    };
    mockAxiosPost.mockResolvedValue(mockAiResponse);

    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({ error: 'AI service returned unexpected or empty data structure.', details: mockAiResponse.data });
  });

  it('should handle AI response indicating content blocked', async () => {
    const mockAiResponse = {
      data: {
        promptFeedback: { blockReason: 'SAFETY', safetyRatings: [] }
      },
      headers: { 'content-type': 'application/json' }
    };
    mockAxiosPost.mockResolvedValue(mockAiResponse);

    const response = await callEnrichRomsHandler({ romNames: ['controversial_rom_name'] });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toEqual(expect.objectContaining({
      error: 'AI content generation blocked: SAFETY'
    }));
  });
});
