import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para QA validación visual de HorasPRO.
 * Server y Vite deben estar arrancados manualmente antes (puertos 3001 y 5173).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,         // ejecutamos en serie para no chocar con el seed
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
