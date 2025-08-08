
import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright';

let electronApp;

test.beforeAll(async () => {
  electronApp = await electron.launch({ args: ['main.js'] });
});

test.afterAll(async () => {
  await electronApp.close();
});

test('Main window is created', async () => {
  const page = await electronApp.firstWindow();
  await page.waitForSelector('h1');
  const text = await page.$eval('h1', (el) => el.textContent);
  expect(text).toBe('Retro Game Launcher');
});
