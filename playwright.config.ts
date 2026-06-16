import {
  defineConfig,
  devices
} from '@playwright/test';

const isCI = Boolean(process.env.CI);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',

  /*
   * Dit is de maximale tijd voor de volledige test.
   * Niet verwarren met de timeout van één assertion.
   */
  timeout: isCI
    ? 90_000
    : 45_000,
  
  expect: {
    timeout: isCI
      ? 15_000
      : 7_500,
  },

  /*
   * Laat GitHub Actions falen wanneer per ongeluk
   * test.only in de broncode staat.
   */
  forbidOnly: isCI,

  /*
   * Eén retry blijft als vangnet beschikbaar.
   * Meer retries zouden structurele fouten maskeren.
   */
  retries: isCI
  ? 1
  : 0,
  
  workers: isCI
  ? 1
  : undefined,

  /* Run tests in files in parallel */
  fullyParallel: false,

  reporter: isCI
    ? [
      ['github'],
      [
        'html',
        {
          outputFolder:
            'playwright-report',
          open: 'never',
        },
      ],
    ]
  : [
      [
        'html',
        {
          outputFolder:
            'playwright-report',
          open: 'never',
        },
      ],
    ],


  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
