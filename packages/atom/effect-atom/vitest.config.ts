import { inlineSchemaTests } from '@systemfsoftware/effect-schema-vite'
import { defineConfig, sharedConfig } from '@systemfsoftware/vitest-config'
import { playwright } from '@vitest/browser-playwright'
import { nodeTest } from './vitest.node.config.js'

export default defineConfig({
  ...sharedConfig,
  plugins: [inlineSchemaTests()],
  test: {
    ...sharedConfig.test,
    projects: [
      { extends: true, test: nodeTest },
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
          include: ['./tests/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      ...sharedConfig.test?.coverage,
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
