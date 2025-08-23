const fs = require('fs');
const path = require('path');

describe('ROM scanning', () => {

  test('Returns empty array if no valid ROM files', () => {
    const emptyDir = path.join(__dirname, 'fixtures', 'empty');
    if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });
    const files = fs.readdirSync(emptyDir);
    const validExtensions = ['.smc', '.zip'];
    const romFiles = files.filter(file => validExtensions.includes(path.extname(file)));
    expect(romFiles).toEqual([]);
    });
  
  });

  test('Ignores files with invalid extensions', () => {
    const invalidDir = path.join(__dirname, 'fixtures', 'invalid');
    if (!fs.existsSync(invalidDir)) fs.mkdirSync(invalidDir, { recursive: true });
    fs.writeFileSync(path.join(invalidDir, 'file1.txt'), '');
    fs.writeFileSync(path.join(invalidDir, 'image.png'), '');
    const files = fs.readdirSync(invalidDir);
    const validExtensions = ['.smc', '.zip'];
    const romFiles = files.filter(file => validExtensions.includes(path.extname(file)));
    expect(romFiles).toEqual([]);
    fs.unlinkSync(path.join(invalidDir, 'file1.txt'));
    fs.unlinkSync(path.join(invalidDir, 'image.png'));
  });

  test('Detects ROM files with mixed case extensions', () => {
    const mixedDir = path.join(__dirname, 'fixtures', 'mixed');
    if (!fs.existsSync(mixedDir)) fs.mkdirSync(mixedDir, { recursive: true });
    fs.writeFileSync(path.join(mixedDir, 'GAME1.SMC'), '');
    fs.writeFileSync(path.join(mixedDir, 'game2.ZIP'), '');
    const files = fs.readdirSync(mixedDir);
    const validExtensions = ['.smc', '.zip'];
    const romFiles = files.filter(file => validExtensions.includes(path.extname(file).toLowerCase()));
    expect(romFiles).toContain('GAME1.SMC');
    expect(romFiles).toContain('game2.ZIP');
    fs.unlinkSync(path.join(mixedDir, 'GAME1.SMC'));
    fs.unlinkSync(path.join(mixedDir, 'game2.ZIP'));
  });

  test('Works with a large number of files', () => {
    const largeDir = path.join(__dirname, 'fixtures', 'large');
    if (!fs.existsSync(largeDir)) fs.mkdirSync(largeDir, { recursive: true });
    for (let i = 0; i < 100; i++) {
      fs.writeFileSync(path.join(largeDir, `game${i}.smc`), '');
    }
    const files = fs.readdirSync(largeDir);
    const validExtensions = ['.smc', '.zip'];
    const romFiles = files.filter(file => validExtensions.includes(path.extname(file)));
    expect(romFiles.length).toBe(100);
    for (let i = 0; i < 100; i++) {
      fs.unlinkSync(path.join(largeDir, `game${i}.smc`));
    }
  });

  test('Does not scan subdirectories for ROM files', () => {
    const subDir = path.join(__dirname, 'fixtures', 'subdir');
    const nestedDir = path.join(subDir, 'nested');
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
    if (!fs.existsSync(nestedDir)) fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'game1.smc'), '');
    fs.writeFileSync(path.join(nestedDir, 'game2.smc'), '');
    const files = fs.readdirSync(subDir);
    const validExtensions = ['.smc', '.zip'];
    const romFiles = files.filter(file => validExtensions.includes(path.extname(file)));
    expect(romFiles).toContain('game1.smc');
    expect(romFiles).not.toContain('game2.smc');
    fs.unlinkSync(path.join(subDir, 'game1.smc'));
    fs.unlinkSync(path.join(nestedDir, 'game2.smc'));
  });