import { quietBuild } from '@systemfsoftware/tsdown-config/quiet-build'
import { defineConfig } from 'tsdown'

type ExportEntry = string | Record<string, string | undefined>

const exportPresetEntryOnly = (exports: Record<string, ExportEntry>): Record<string, ExportEntry> => {
  delete exports['./plugin']
  const entry = exports['.']
  if (typeof entry === 'string') {
    exports['.'] = { types: './dist/index.d.ts', default: entry }
  } else if (typeof entry === 'object') {
    const { default: defaultEntry, types: _existingTypes, ...rest } = entry
    const withDefault = typeof defaultEntry === 'string' ? { default: defaultEntry } : {}
    exports['.'] = { ...rest, types: './dist/index.d.ts', ...withDefault }
  }
  return exports
}

export default defineConfig({
  ...quietBuild,
  entry: {
    index: './src/index.ts',
    plugin: './src/plugin.ts',
  },
  format: 'esm',
  dts: true,
  tsconfig: './tsconfig.build.json',
  outExtensions: () => ({ js: '.mjs', dts: '.d.ts' }),
  exports: {
    devExports: '@systemfsoftware/source',
    customExports: exportPresetEntryOnly,
  },
  deps: {
    onlyBundle: false,
  },
})
