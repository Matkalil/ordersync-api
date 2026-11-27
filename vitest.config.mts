import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://ordersync:ordersync@localhost:5434/ordersync_test',
      API_KEY: 'test-api-key-32-format-big-string',
      WEBHOOK_SECRET: 'test-webhook-secret-32-formati-big-string',
    },
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
  },
});
