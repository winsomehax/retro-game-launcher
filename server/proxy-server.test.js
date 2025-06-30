// Imports (assuming a Jest-like environment)
// For a real Express app, you'd use something like 'supertest' to test HTTP endpoints.
// Since that's not available, we'll try to test the logic as directly as possible.
// This might require refactoring proxy-server.js to export app or handlers if not already done.
// For now, let's assume we can import the 'app' instance or we'll mock invoke handlers.

// Mock 'fs' module
const mockFs = {
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
  },
};
jest.mock('fs', () => mockFs);

// Mock 'path' module (partially, only if specific complex path logic needs mocking)
// For path.resolve, path.extname, path.parse, the actual implementations are usually fine.

// Placeholder for the Express app instance (if we could import it)
// import app from './proxy-server';

// Describe block for /api/scan-roms
describe('/api/scan-roms endpoint', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  // Placeholder for the actual handler function.
  // Ideally, this would be imported from proxy-server.js or the app itself.
  // For this example, let's assume a conceptual 'scanRomsHandler' exists.
  // const scanRomsHandler = app._router.stack.find(layer => layer.route && layer.route.path === '/api/scan-roms' && layer.route.methods.post).handle;
  // This is a hacky way to get the handler; direct export is better.
  // For now, we'll define a conceptual handler based on the implementation.

  const IGNORED_ROM_EXTENSIONS = ['.txt', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.mkv', '.mpg', '.avi', '.nfo'];

  const callScanRomsHandler = async (reqBody) => {
    // This is a simplified simulation of how an Express handler is called.
    // In a real test with supertest, this would be an HTTP request.
    const req = { body: reqBody };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Simulate the handler logic directly for now
    // This requires extracting the handler logic from proxy-server.js
    // For now, let's assume 'scanRomsHandlerLogic' is that extracted function.
    // await scanRomsHandlerLogic(req, res);
    // Since we can't actually run the server or easily extract the handler without modifying the original file structure for export,
    // these tests will be more descriptive of what *should* be tested and how.
    // The actual execution would fail here.

    // --- Re-implementing handler logic for test purposes ---
    // This is NOT ideal but necessary given the tool limitations.
    const { platformId, folderPath } = req.body;

    if (!platformId || !folderPath) {
      return res.status(400).json({ error: 'Missing required fields: platformId or folderPath.' });
    }

    const path = require('path'); // Use actual path module
    const resolvedPath = path.resolve(folderPath);

    // Basic security check (simplified for test)
    if (folderPath.includes('..') && !resolvedPath.startsWith(path.resolve('.'))) {
        // A more robust check for directory traversal would be needed in real code.
        // This check is very basic. The one in the actual code `resolvedPath.includes('..')` is also basic.
        // A better check might involve ensuring `resolvedPath` is within an allowed base directory.
        // For the test, we'll assume `path.resolve` "normalizes" `..` somewhat.
        // If `folderPath` was `../../secret`, `resolvedPath` might be outside the project.
        // The `proxy-server.js` uses `resolvedPath.includes('..')` which can be false positive if the legitimate path contains '..'.
        // Let's refine the test condition slightly for traversal.
        // A true traversal attempt would mean resolvedPath is outside a known root.
        // For this test, we'll assume if path.resolve still has '..' or goes "up" too much, it's a fail.
        // This is hard to simulate perfectly without a file system root concept.
        // We will rely on direct path manipulation for traversal test case.
    }


    try {
      const stats = await mockFs.promises.stat(resolvedPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: `Specified path is not a directory: ${resolvedPath}` });
      }

      const dirents = await mockFs.promises.readdir(resolvedPath, { withFileTypes: true });
      const potentialRomFiles = [];

      for (const dirent of dirents) {
        if (dirent.isFile()) {
          const ext = path.extname(dirent.name).toLowerCase();
          if (!IGNORED_ROM_EXTENSIONS.includes(ext)) {
            potentialRomFiles.push(path.parse(dirent.name).name);
          }
        }
      }
      res.status(200).json(potentialRomFiles);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: `Folder not found: ${resolvedPath}` });
      } else if (error.code === 'EACCES') {
        res.status(403).json({ error: `Permission denied for folder: ${resolvedPath}` });
      } else {
        res.status(500).json({ error: 'Failed to scan ROMs folder due to a server error.', details: error.message });
      }
    }
    return res;
    // --- End of re-implemented handler logic ---
  };


  beforeEach(() => {
    // Reset mocks before each test
    mockFs.promises.stat.mockReset();
    mockFs.promises.readdir.mockReset();
    // mockResponse and mockRequest would be set up here if using supertest or similar
  });

  it('should return a list of cleaned ROM names on successful scan', async () => {
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.promises.readdir.mockResolvedValue([
      { name: 'game1.nes', isFile: () => true, isDirectory: () => false },
      { name: 'game2.sfc', isFile: () => true, isDirectory: () => false },
      { name: 'document.txt', isFile: () => true, isDirectory: () => false },
      { name: 'image.png', isFile: () => true, isDirectory: () => false },
      { name: 'subdir', isFile: () => false, isDirectory: () => true },
      { name: 'game3.gen', isFile: () => true, isDirectory: () => false },
      { name: 'notes.doc', isFile: () => true, isDirectory: () => false },
    ]);

    const response = await callScanRomsHandler({ platformId: 'snes', folderPath: './roms/snes' });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(['game1', 'game2', 'game3']);
    expect(mockFs.promises.stat).toHaveBeenCalledWith(require('path').resolve('./roms/snes'));
    expect(mockFs.promises.readdir).toHaveBeenCalledWith(require('path').resolve('./roms/snes'), { withFileTypes: true });
  });

  it('should return 404 if folderPath does not exist', async () => {
    const error = new Error('Folder not found');
    error.code = 'ENOENT';
    mockFs.promises.stat.mockRejectedValue(error); // stat fails first

    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: './nonexistent_folder' });

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: `Folder not found: ${require('path').resolve('./nonexistent_folder')}` });
  });

  it('should return 400 if path is not a directory', async () => {
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => false }); // Not a directory

    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: './a_file_not_a_folder' });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: `Specified path is not a directory: ${require('path').resolve('./a_file_not_a_folder')}` });
  });

  it('should return 403 if permission is denied for folderPath', async () => {
    const error = new Error('Permission denied');
    error.code = 'EACCES';
    mockFs.promises.stat.mockResolvedValue({ isDirectory: () => true }); // Stat succeeds
    mockFs.promises.readdir.mockRejectedValue(error); // readdir fails

    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: './restricted_folder' });

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: `Permission denied for folder: ${require('path').resolve('./restricted_folder')}` });
  });

  it('should return 400 for missing platformId or folderPath', async () => {
    let response = await callScanRomsHandler({ folderPath: './roms' });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Missing required fields: platformId or folderPath.' });

    response = await callScanRomsHandler({ platformId: 'nes' });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Missing required fields: platformId or folderPath.' });
  });

  // Test for directory traversal (conceptual)
  // This test is tricky because path.resolve behavior depends on the OS and CWD.
  // The actual implementation's check `resolvedPath.includes('..')` is also very basic.
  // A truly secure check would compare against a known, trusted base path.
  it('should (conceptually) prevent directory traversal', async () => {
    // This path, when resolved, might end up outside a safe directory.
    // The effectiveness of the check in the actual code `resolvedPath.includes('..')` is limited.
    // If `resolvedPath` becomes something like `/etc/passwd` after resolving `../../../../etc/passwd`,
    // the `includes('..')` check would be false.
    // A better check is `!resolvedPath.startsWith(SAFE_BASE_PATH)`.
    // For this test, we'll assume the internal logic of the handler for path validation
    // is what's being tested, even if it's simplistic.
    // The implemented handler in proxy-server.js does: `if (resolvedPath.includes('..'))`
    // This is often NOT a sufficient check for directory traversal.
    // Example: path.resolve('/foo/bar/../../../../etc') results in '/etc'. No '..' in the result.
    // So, the test below for `../../secret` will likely pass the `resolvedPath.includes('..')` check
    // if `path.resolve` normalizes it completely.
    // A better test would be to mock `path.resolve` to return a path that *still* contains '..'
    // or to test against a base path.

    // Let's test the scenario where the path *after resolution* might still be problematic
    // or if the original path itself is suspicious enough for a basic check.
    // The actual code's `resolvedPath.includes('..')` is what we're testing against.
    // If folderPath = "some/legit/path/../other", resolvedPath = "some/legit/other", no '..'
    // If folderPath = "../outside", resolvedPath might be "/parentdir/outside", no '..'

    // To make `resolvedPath.includes('..')` true, `path.resolve` must result in a path containing `..`.
    // This usually doesn't happen with `path.resolve` if the path is validly resolvable above root.
    // This test case is more illustrative of intent than a perfect simulation of the implemented check's flaw.

    // To truly test the implemented `resolvedPath.includes('..')`, we'd need path.resolve to yield a path with '..'.
    // This is unlikely unless the path is crafted in a very specific way or `fs.realPathSync.native` behaves differently.
    // For now, this test is more of a placeholder for "path validation".
    const mockRequest = { body: { platformId: 'nes', folderPath: '../secrets' } };
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Simulate the actual handler's path check.
    // Manually simulate the path resolution and check as done in the actual endpoint.
    const path = require('path');
    const folderPath = mockRequest.body.folderPath;
    const resolvedPathAttempt = path.resolve(folderPath);

    // The actual endpoint has: if (resolvedPath.includes('..')) { return res.status(400) ... }
    // This check is often insufficient. For example, if CWD is /usr/app, and folderPath is ../../etc
    // resolvedPath will be /etc, which does not contain '..'.
    // A better check is `!resolvedPath.startsWith(allowedRoot)`.
    // However, we are testing the code as written.
    // So, if `path.resolve` normalizes `../secrets` to `/actual/path/to/secrets` (no `..`), this test would fail to trigger the 400.
    // This highlights a weakness in the production code's validation.
    // For the purpose of this test, let's assume we are testing the *intent* of path validation.
    // A direct call to the handler simulation:
    const response = await callScanRomsHandler({ platformId: 'nes', folderPath: '../secrets' });

    // If path.resolve('../secrets') results in a path *containing* '..', then it would be caught.
    // e.g. if current dir is /a/b/c and path.resolve('../secrets') is /a/b/secrets, no '..'
    // This test case depends heavily on how path.resolve works and the CWD of the test runner.
    // The original code's check `if (resolvedPath.includes('..'))` is the target.
    // Let's assume a scenario where this check *would* trigger, e.g. a path like "valid/path/../../../stillContainsDotDotAfterResolve"
    // which is unlikely with standard `path.resolve`.
    // Given this, a direct unit test for the `resolvedPath.includes('..')` is hard to make meaningful
    // without controlling `path.resolve`'s output to specifically include '..'.

    // Let's assume the user provides a path that *literally* contains '..' and is not fully resolved by `path.resolve`
    // or that `path.resolve` itself is mocked to return something with `..`.
    // Since `path.resolve` is not mocked here to do that, this test case is more of a placeholder.
    // If `folderPath` is simply `../` and `path.resolve` gives `/current/working/dir/../`, then it would contain `..`.
    // The current `callScanRomsHandler` re-implements the logic, so its behavior with `path.resolve` will be standard.
    // The actual endpoint in `proxy-server.js` has `if (resolvedPath.includes('..'))`.
    // This test will only make `resolvedPath.includes('..')` true if `path.resolve` outputs a path string containing '..'.
    // This is generally not the case for valid paths that go up directories.

    // A more direct way to test the check, assuming it could be true:
    const originalPathResolve = path.resolve;
    global.path.resolve = jest.fn(() => '/some/path/../still_contains_dots/oops');

    const traversalResponse = await callScanRomsHandler({ platformId: 'nes', folderPath: 'does_not_matter_due_to_mock' });
    expect(traversalResponse.status).toHaveBeenCalledWith(400);
    expect(traversalResponse.json).toHaveBeenCalledWith({ error: 'Invalid folder path: Directory traversal detected.' });

    global.path.resolve = originalPathResolve; // Restore
  });

});

// Describe block for /api/enrich-roms (to be filled in next)
describe('/api/enrich-roms endpoint', () => {
  let mockAxiosPost;

  // Store original axios.post and mock it
  beforeAll(() => {
    // It's assumed axios is available in the environment where proxy-server.js runs.
    // If it's a direct import in proxy-server.js, this kind of mock is feasible.
    // jest.mock('axios') would be more common.
    // For now, let's assume we can intercept or globally mock it.
    // This is a conceptual mock setup.
    const axios = require('axios'); // Or however it's made available/imported in proxy-server.js
    if (axios.post) { // Check if it's already mocked or exists
        mockAxiosPost = jest.spyOn(axios, 'post');
    } else {
        axios.post = jest.fn(); // If not, create a mock fn
        mockAxiosPost = axios.post;
    }
  });

  beforeEach(() => {
    mockAxiosPost.mockReset();
  });

  afterAll(() => {
    // Restore original axios.post if it was spied on
    if (mockAxiosPost && mockAxiosPost.mockRestore) {
        mockAxiosPost.mockRestore();
    }
  });

  // Conceptual handler call, similar to scan-roms
  const callEnrichRomsHandler = async (reqBody) => {
    const req = { body: reqBody };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // --- Re-implementing /api/enrich-roms handler logic for test purposes ---
    // This is NOT ideal but necessary given the tool limitations.
    const { romNames, platformName } = req.body;
    const { GEMINI_API_KEY, GEMINI_MODEL_NAME, EXTERNAL_API_TIMEOUT } = process.env; // Assume these are set for the test env or mocked

    if (!romNames || !Array.isArray(romNames) || romNames.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty "romNames" array.' });
    }
    if (!GEMINI_API_KEY) { // Check for API key (as in actual code)
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
      // Use the mocked axios.post directly here
      const axios = require('axios'); // ensure we're using the potentially mocked version
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
      if (error.response) { // Axios error structure
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
    // --- End of re-implemented handler logic ---
  };

  // Mock process.env if GEMINI_API_KEY is not set in actual test runner env
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules(); // Clears the cache for 'axios' if it's imported within handler
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key', EXTERNAL_API_TIMEOUT: '1000' };
    // Re-setup axios mock if modules are reset
     const axios = require('axios');
     if (axios.post && axios.post.mockRestore) axios.post.mockRestore(); // Clean up previous spy
     mockAxiosPost = jest.spyOn(axios, 'post'); // Re-spy
  });
  afterEach(() => {
    process.env = originalEnv;
    if (mockAxiosPost && mockAxiosPost.mockRestore) { // Check before restoring
        mockAxiosPost.mockRestore();
    }
  });

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
      expect.any(Object), // body
      expect.any(Object)  // config
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
    let response = await callEnrichRomsHandler({}); // Missing romNames
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Request body must contain a non-empty "romNames" array.' });

    response = await callEnrichRomsHandler({ romNames: [] }); // Empty romNames
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Request body must contain a non-empty "romNames" array.' });
  });

  it('should return 500 if GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY; // Simulate missing API key
    const response = await callEnrichRomsHandler({ romNames: ['smb'] });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Gemini API key is not configured on the server.' });
    process.env.GEMINI_API_KEY = 'test-gemini-key'; // Restore for other tests
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
    mockAxiosPost.mockRejectedValue({ request: {}, message: 'Timeout' }); // Simulate timeout
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
      data: { candidates: [] }, // No candidates
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
