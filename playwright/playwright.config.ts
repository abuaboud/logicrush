import { defineConfig, devices } from '@playwright/test'

// E2E is deliberately scoped to the critical user journeys — the paths where a
// regression loses data, loses traffic, or corrupts contest history. Feature
// detail is covered by unit and integration tests in the server and web
// packages; duplicating it here buys slow tests, not confidence.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // contest journeys manipulate a shared clock
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI !== undefined ? 2 : 0,
  workers: 1,
  reporter: process.env.CI !== undefined ? [['github'], ['html']] : [['list'], ['html']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ar',
    timezoneId: 'Asia/Amman', // the site's own zone — see ADR 0003 and issue #13
  },

  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      // The site is mobile-heavy and RTL; a desktop-only suite misses layout
      // regressions that only show at narrow widths. Mobile runs the read-only
      // browse journey (layout coverage) -- the stateful solve flow is covered on
      // chromium; running it here too would mutate the shared seeded DB (the demo
      // user can only solve a problem once) and collide with the chromium run.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
      testMatch: /01-.*\.spec\.ts/,
    },
  ],

  webServer:
    process.env.E2E_BASE_URL !== undefined
      ? undefined
      : {
          // E2E uses a no-watch server (dev:e2e) so a file-watcher restart can't
          // wipe the in-memory PGlite mid-run; plain `npm run dev` otherwise.
          command: process.env.E2E_SEED === '1' ? 'npm run dev:e2e' : 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          cwd: '..',
        },
})
