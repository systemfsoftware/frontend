import { quietBuild } from '@systemfsoftware/tsdown-config/quiet-build'
import { defineConfig } from 'tsdown'

export default defineConfig({
  ...quietBuild,
  entry: [
    'src/preset.ts',
    'src/types.ts',
    'src/render.tsx',
    'src/entry-preview.ts',
    'src/entry-preview-docs.ts',
    'src/extractArgTypes.ts',
    'src/preview-defaults.ts',
    'src/decorators.ts',
    'src/decoratedTree.ts',
    'src/storyStyles.ts',
    'src/slotArgs.ts',
    // The framework's story docs provider builds AI agents' snippets with it.
    'src/docs/generateAstroSource.ts',
    'src/index.ts',
  ],
  format: 'esm',
  dts: {
    // render.tsx and entry-preview.ts import virtual modules that cannot be resolved while
    // emitting declarations; both are runtime-only entries with no consumer needing types.
    entry: [
      'src/preset.ts',
      'src/types.ts',
      'src/extractArgTypes.ts',
      'src/preview-defaults.ts',
      'src/decorators.ts',
      'src/decoratedTree.ts',
      'src/storyStyles.ts',
      'src/slotArgs.ts',
      'src/docs/generateAstroSource.ts',
      'src/index.ts',
    ],
  },
  sourcemap: true,
  clean: true,
  tsconfig: './tsconfig.json',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  deps: { neverBundle: [/^(virtual|astro):/] },
})
