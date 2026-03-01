import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://lightsalmon-tarsier-683012.hostingersite.com',
    httpCredentials: {
      username: 'Ibraheem',
      password: 'EmWXce4CtQbMJsoOrByvP22q',
    },
    ignoreHTTPSErrors: true,
  },
  reporter: [['list']],
});
