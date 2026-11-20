import { quietBuild } from '@systemfsoftware/tsdown-config/quiet-build'
import { defineConfig } from 'tsdown'

export default defineConfig({
  ...quietBuild,
  entry: [
    'src/index.ts',
    'src/node/index.ts',
    'src/preset.ts',
    'src/testing.ts',
    'src/vitest/index.ts',
    'src/integrations/index.ts',
    // Its own entry because core's docgen worker imports it by absolute path.
    'src/docgen/docgen-worker.ts',
    'src/renderer/renderer-dev.ts',
    'src/renderer/renderer-static.ts',
    'src/renderer/renderer-server.ts',
    'src/middleware.ts',
    'src/vitest/global-setup.ts',
    // Its own entry because Astro loads it by path as `image.service.entrypoint`.
    'src/storybookImageService.ts',
  ],
  format: 'esm',
  dts: {
    // middleware.ts is loaded dynamically through viteServer.ssrLoadModule and imports virtual
    // modules that cannot be resolved while emitting declarations; nothing consumes its types.
    entry: [
      'src/index.ts',
      'src/node/index.ts',
      'src/preset.ts',
      'src/testing.ts',
      'src/vitest/index.ts',
      'src/integrations/index.ts',
      'src/docgen/docgen-worker.ts',
      'src/storybookImageService.ts',
    ],
  },
  sourcemap: true,
  clean: true,
  tsconfig: './tsconfig.json',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  deps: {
    neverBundle: [/^(virtual|astro):/, /^@sveltejs\//, 'vite-plugin-solid', /^@vitejs\/plugin-/, '@preact/preset-vite'],
  },
})
