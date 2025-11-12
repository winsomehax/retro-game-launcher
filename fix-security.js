const fs = require('fs');
const path = require('path');

// Read the main.js file
const filePath = path.join(__dirname, 'dist', 'main.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add the validatePath function after the initial imports
content = content.replace(
  /(const \{ app, BrowserWindow, ipcMain, net \} = require\('electron'\);[\s\S]*?require\('dotenv'\)\.config\(\);)/,
  `$1

// Function to validate and resolve file paths
function validatePath(inputPath, baseDir = null) {
  // Resolve the path to handle relative paths
  let resolvedPath = path.resolve(inputPath);
  
  // If a base directory is provided, ensure the path is within it
  if (baseDir) {
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error('Path traversal attempt detected');
    }
  }
  
  // Prevent access to sensitive system directories
  const sensitivePaths = ['/etc/', '/root/', '/home/', '/usr/', '/var/'];
  for (const sensitivePath of sensitivePaths) {
    if (resolvedPath.startsWith(sensitivePath)) {
      throw new Error('Access to sensitive system directories is forbidden');
    }
  }
  
  return resolvedPath;
}`
);

// Fix the read-directory handler
content = content.replace(
  /ipcMain\.handle\('read-directory', async \(event, dirPath\) => \{[\s\S]*?return \[\];[\s\S]*?\}\);/,
  `ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    // Validate the directory path
    const safeDirPath = validatePath(dirPath);
    const files = fs.readdirSync(safeDirPath);
    return files.filter(file => {
      const filePath = path.join(safeDirPath, file);
      // Validate each file path
      const safeFilePath = validatePath(filePath, safeDirPath);
      return fs.statSync(safeFilePath).isFile();
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});`
);

// Fix the save-settings handler
content = content.replace(
  /ipcMain\.handle\('save-settings', async \(event, settings\) => \{[\s\S]*?return \{ success: false, error: error\.message \};[\s\S]*?\}\);/,
  `ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const envPath = path.join(__dirname, '.env');
    // Validate the .env file path
    const safeEnvPath = validatePath(envPath, __dirname);
    let envContent = '';

    // Read existing .env file if it exists
    if (fs.existsSync(safeEnvPath)) {
      envContent = fs.readFileSync(safeEnvPath, 'utf-8');
    }

    // Update or add each setting
    for (const [key, value] of Object.entries(settings)) {
      // Convert boolean values to strings
      const stringValue = typeof value === 'boolean' ? String(value) : value;
      const regex = new RegExp(\`^\${key}=.*$\`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, \`\${key}=\${stringValue}\`);
      } else {
        envContent += \`
\${key}=\${stringValue}\`;
      }
    }

    // Write updated content back to .env file
    fs.writeFileSync(safeEnvPath, envContent.trim());
    
    // Update process.env for immediate use
    Object.assign(process.env, settings);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
});`
);

// Fix the load-data handler
content = content.replace(
  /ipcMain\.handle\('load-data', async \(event, dataType\) => \{[\s\S]*?const filePath = path\.join\(__dirname, 'metadata\.json'\);[\s\S]*?try \{[\s\S]*?if \(fs\.existsSync\(filePath\)\) \{[\s\S]*?\}[\s\S]*?return \[\];/,
  `ipcMain.handle('load-data', async (event, dataType) => {
  const filePath = path.join(__dirname, 'metadata.json');
  try {
    // Validate the file path
    const safeFilePath = validatePath(filePath, __dirname);
    if (fs.existsSync(safeFilePath)) {
      const data = JSON.parse(fs.readFileSync(safeFilePath, 'utf-8'));
      
      // Handle the new tag data types
      if (dataType === 'gameTags' || dataType === 'platformTags') {
        return data[dataType] || [];
      }
      
      return data[dataType] || [];
    }
    return [];
  } catch (error) {
    console.error(\`Error loading \${dataType}:\`, error);
    return [];
  }
});`
);

// Fix the save-data handler
content = content.replace(
  /ipcMain\.handle\('save-data', async \(event, dataType, data\) => \{[\s\S]*?let allData = \{\};[\s\S]*?fs\.writeFileSync\(filePath, JSON\.stringify\(allData, null, 2\)\);[\s\S]*?\}\);/,
  `ipcMain.handle('save-data', async (event, dataType, data) => {
  const filePath = path.join(__dirname, 'metadata.json');
  try {
    // Validate the file path
    const safeFilePath = validatePath(filePath, __dirname);
    let allData = {};
    if (fs.existsSync(safeFilePath)) {
      allData = JSON.parse(fs.readFileSync(safeFilePath, 'utf-8'));
    }
    
    // Handle the new tag data types
    if (dataType === 'gameTags' || dataType === 'platformTags') {
      allData[dataType] = data;
    } else {
      allData[dataType] = data;
    }
    
    fs.writeFileSync(safeFilePath, JSON.stringify(allData, null, 2));
    return { success: true };
  } catch (error) {
    console.error(\`Error saving \${dataType}:\`, error);
    return { success: false, error: error.message };
  }
});`
);

// Fix the get-platforms handler
content = content.replace(
  /ipcMain\.handle\('get-platforms', async \(\) => \{[\s\S]*?if \(fs\.existsSync\(CACHE_FILE\)\) \{[\s\S]*?if \(Date\.now\(\) - cachedData\.timestamp < CACHE_DURATION\) \{[\s\S]*?return cachedData\.platforms;/,
  `ipcMain.handle('get-platforms', async () => {
  try {
    // Validate the cache file path
    const safeCachePath = validatePath(CACHE_FILE, __dirname);
    if (fs.existsSync(safeCachePath)) {
      const cachedData = JSON.parse(fs.readFileSync(safeCachePath, 'utf-8'));
      if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.platforms;`
);

// Fix the get-platform-media handler
content = content.replace(
  /ipcMain\.handle\('get-platform-media', async \(event, platformId\) => \{[\s\S]*?if \(fs\.existsSync\(CACHE_FILE\)\) \{[\s\S]*?const platform = cachedData\.platforms\.find\(p => p\.id === numericPlatformId\);[\s\S]*?return platform\.media;/,
  `ipcMain.handle('get-platform-media', async (event, platformId) => {
  try {
    // Validate the cache file path
    const safeCachePath = validatePath(CACHE_FILE, __dirname);
    if (fs.existsSync(safeCachePath)) {
      const cachedData = JSON.parse(fs.readFileSync(safeCachePath, 'utf-8'));
      const numericPlatformId = parseInt(platformId, 10);
      console.log('Searching for platformId:', numericPlatformId, 'in cache.');
      const platform = cachedData.platforms.find(p => p.id === numericPlatformId);
      
      if (platform) {
        console.log('Platform found in cache:', platform.name);
        console.log('Media for platform:', JSON.stringify(platform.media, null, 2));
        return platform.media;`
);

// Write the fixed content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Security fixes applied successfully!');