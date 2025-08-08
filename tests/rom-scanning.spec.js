
import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

let electronApp;

test.beforeAll(async () => {
  electronApp = await electron.launch({ args: ['main.js'] });
});

test.afterAll(async () => {
  await electronApp.close();
});

test('Scans a folder and identifies valid ROM files', async () => {
  const page = await electronApp.firstWindow();

  // Mock the file dialog to return our test folder
  await page.evaluate(() => {
    window.showDirectoryPicker = async () => {
      return {
        name: 'roms',
        kind: 'directory',
        entries: async function*() {
          yield {
            name: 'game1.smc',
            kind: 'file',
            getFile: async () => ({})
          };
          yield {
            name: 'game2.zip',
            kind: 'file',
            getFile: async () => ({})
          };
          yield {
            name: 'document.txt',
            kind: 'file',
            getFile: async () => ({})
          };
          yield {
            name: 'image.png',
            kind: 'file',
            getFile: async () => ({})
          };
        }
      };
    };
  });

  // Click the button to trigger the folder scan
  await page.click('#scan-roms-button');

  // Wait for the ROM list to be populated
  await page.waitForSelector('#rom-list li');

  // Check that the correct ROMs are listed
  const roms = await page.$$eval('#rom-list li', (items) => items.map((item) => item.textContent));
  expect(roms).toEqual(['game1.smc', 'game2.zip']);
});
