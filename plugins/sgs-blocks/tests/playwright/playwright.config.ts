import { defineConfig } from '@playwright/test';

// Credentials come from environment variables. See .env.example.
// Never commit a real WP application password to this file.
const wpUser = process.env.WP_TEST_USER || 'Ibraheem';
const wpPassword = process.env.WP_TEST_APP_PASSWORD;

if (!wpPassword) {
  throw new Error(
    'WP_TEST_APP_PASSWORD environment variable is required. ' +
    'Copy .env.example to .env.local and fill in the app password.'
  );
}

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.WP_TEST_BASE_URL || 'https://lightsalmon-tarsier-683012.hostingersite.com',
    httpCredentials: {
      username: wpUser,
      password: wpPassword,
    },
    ignoreHTTPSErrors: true,
  },
  reporter: [['list']],
});
