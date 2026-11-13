import { inlineSchemaTests } from '@systemfsoftware/effect-schema-vite'
import { defineConfig, sharedConfig } from '@systemfsoftware/vitest-config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  ...sharedConfig,
  plugins: [inlineSchemaTests()],
  test: {
    ...sharedConfig.test,
    projects: [
      {
        extends: true,
        define: {
          'process.platform': JSON.stringify('linux'),
          'process.env': JSON.stringify({
            CI: process.env.CI,
            AGENT: process.env.AGENT,
            STRYKER_MUTATOR_WORKER: process.env.STRYKER_MUTATOR_WORKER,
          }),
        },
        test: {
          name: 'browser',
          include: ['./tests/**/*.integration.test.ts', '!./tests/ssr.integration.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          include: ['./tests/ssr.integration.test.ts', './src/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
    coverage: {
      ...sharedConfig.test?.coverage,
      provider: 'istanbul',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}'],
    },
  },
})
