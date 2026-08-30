import { defineConfig, devices } from '@playwright/test';

import { config } from './src/config/env';

/**
 * A single Playwright config runs two isolated projects instead of two
 * separate test runners: "api" (no browser, HTTP-only contract checks
 * against the public CMS) and "web" (Chromium against the published Casa
 * Maíz consumer). They share one reporter/report/report location and one
 * trace-on-failure policy, but never share a browser context or state, and
 * each can be run alone with `--project`. This keeps the two kinds of
 * scripts isolated as required, without the extra maintenance cost of two
 * separate test frameworks for a suite this size.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // Flaky-test prevention over retries: a flaky test is a bug in the test.
  // A small worker cap out of courtesy to the shared, public CMS/website --
  // not required for correctness, since every test builds its own state.
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: config.cmsUrl,
      },
    },
    {
      name: 'web',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: config.websiteUrl,
      },
    },
  ],
});
