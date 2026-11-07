import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './scripts',
  testMatch: /e2e-browser\.spec\.ts/,
  timeout: 40_000,
  fullyParallel: false,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], headless:true, trace:'retain-on-failure' },
});
