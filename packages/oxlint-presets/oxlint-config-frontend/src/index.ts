import generic from '@systemfsoftware/oxlint-config-recommended'
import { noNodeBuiltinImports } from '@systemfsoftware/oxlint-plugin-effect-platform'
import type { OxlintConfig, OxlintOverride } from 'oxlint'

import { REACT_IMPORT_BAN_NAMES } from './rules/no-react-effect.config.js'

export interface ImportPattern {
  readonly group?: string[]
  readonly regex?: string
  readonly importNames?: string[]
  readonly message: string
}

export type PatternImportBan = ['error', { readonly patterns: ImportPattern[] }]

const serverStateLibraries = [
  '@tanstack/react-query',
  '@tanstack/react-query-devtools',
  '@tanstack/react-query-persist-client',
  '@tanstack/react-query-next-experimental',
  'react-query',
  'swr',
  'urql',
  '@apollo/client/react',
  '@reduxjs/toolkit/query/react',
  '@trpc/react-query',
  '@trpc/tanstack-react-query',
]

const serverStatePatterns: ImportPattern[] = [
  {
    group: serverStateLibraries.flatMap((name) => [name, `${name}/**`]),
    message:
      'ui-state/server-data-lives-in-atoms: React server-state libraries are forbidden — read server data through effect-atom runtime atoms (appRuntime.atom, useAtomValue) over Effect services.',
  },
]

const reactEffectPatterns: ImportPattern[] = [
  {
    regex: '^react$',
    importNames: [...REACT_IMPORT_BAN_NAMES],
    message:
      'ui-state/react-runs-no-effect: import react by name, and run no React Effect — read through an effect-atom runtime atom with useAtomValue, dispatch a command with useAtomSet.',
  },
]

const uiStatePatterns: ImportPattern[] = [...serverStatePatterns, ...reactEffectPatterns]

const UI_STATE_LAW = 'ui-state/'

export const uiStateImports: PatternImportBan = ['error', { patterns: uiStatePatterns }]

type ImportRuleValue = NonNullable<OxlintOverride['rules']>['no-restricted-imports']

const bansByPattern = (value: ImportRuleValue): value is ['error', { readonly patterns: ImportPattern[] }] =>
  Array.isArray(value) && typeof value[1] === 'object' && 'patterns' in value[1] && Array.isArray(value[1].patterns)

const withoutGenericUiStatePatterns = (value: ImportRuleValue): ImportRuleValue =>
  bansByPattern(value)
    ? ['error', {
      ...value[1],
      patterns: value[1].patterns.filter((pattern) => !pattern.message.startsWith(UI_STATE_LAW)),
    }]
    : value

const withUiState = (value: ImportRuleValue): PatternImportBan => {
  if (value === 'off') return uiStateImports
  if (bansByPattern(value)) return ['error', { ...value[1], patterns: [...value[1].patterns, ...uiStatePatterns] }]
  throw new Error(
    `no-restricted-imports value ${
      JSON.stringify(value)
    } is neither 'off' nor a patterns ban; compose the ui-state ban with it by hand`,
  )
}

export const nodeBuiltinAndUiStateImports: PatternImportBan = withUiState(noNodeBuiltinImports)

const withUiStateOverride = (override: OxlintOverride): OxlintOverride =>
  override.rules?.['no-restricted-imports'] === undefined
    ? override
    : {
      ...override,
      rules: {
        ...override.rules,
        'no-restricted-imports': withUiState(withoutGenericUiStatePatterns(override.rules['no-restricted-imports'])),
      },
    }

// react/rules-of-hooks judges a hook by its name alone, so it reports Effect's `Service.use(...)`
// member calls; those live in .ts modules (atom recipes, service wiring), never in components. It stays
// an error where components live, in `**/*.tsx`, and `react/hooks` checks the Rules of Hooks in every file.
const reactRules: NonNullable<OxlintConfig['rules']> = {
  'react/rules-of-hooks': 'error',
  'react/hooks': 'error',
  'react/capitalized-calls': 'error',
  'react/rule-suppression': 'error',
  'react/unsupported-syntax': 'error',
  'react/no-unstable-nested-components': 'error',
  'react/no-array-index-key': 'error',
  'react/no-clone-element': 'error',
  'react/no-react-children': 'error',
  'react/prefer-function-component': 'error',
  '@systemfsoftware/ui-state/no-react-effect': 'error',
}

const fetchInComponentsMessage =
  'ui-state/components-perform-no-io: a .tsx module performs no I/O — reach the server through an Effect service in a .ts module, read through an effect-atom runtime atom.'

export interface RestrictedGlobal {
  readonly name: string
  readonly message: string
}

export type RestrictedGlobalsBan = ['error', ...RestrictedGlobal[]]

export interface RestrictedProperty {
  readonly object: string
  readonly property: string
  readonly message: string
}

export type RestrictedPropertiesBan = ['error', ...RestrictedProperty[]]

export const fetchInComponentsGlobals: RestrictedGlobalsBan = ['error', {
  name: 'fetch',
  message: fetchInComponentsMessage,
}]

const fetchInComponentsEntries: RestrictedProperty[] = ['globalThis', 'window', 'self'].map((object) => ({
  object,
  property: 'fetch',
  message: fetchInComponentsMessage,
}))

export const fetchInComponentsProperties: RestrictedPropertiesBan = ['error', ...fetchInComponentsEntries]

const fetchInComponentsOverride: OxlintOverride = {
  files: ['**/*.tsx'],
  rules: {
    'no-restricted-globals': fetchInComponentsGlobals,
    'no-restricted-properties': fetchInComponentsProperties,
  },
}

const storyScreenshotEntries: RestrictedProperty[] = [{
  object: 'page',
  property: 'screenshot',
  message:
    'storybook-testing/visual-evidence-comes-from-the-runner: a story file never calls page.screenshot — the runner captures each story through one hook run for every story.',
}]

export const storyScreenshotProperties: RestrictedPropertiesBan = ['error', ...storyScreenshotEntries]

export const fetchAndStoryScreenshotProperties: RestrictedPropertiesBan = [
  'error',
  ...fetchInComponentsEntries,
  ...storyScreenshotEntries,
]

const storyScreenshotOverrides: OxlintOverride[] = [
  { files: ['**/*.stories.ts'], rules: { 'no-restricted-properties': storyScreenshotProperties } },
  { files: ['**/*.stories.tsx'], rules: { 'no-restricted-properties': fetchAndStoryScreenshotProperties } },
]

const uiStatePlugin = new URL('./plugin.mjs', import.meta.url).href

const frontendConfig: OxlintConfig = {
  ...generic,
  plugins: [...(generic.plugins ?? []), 'react'],
  jsPlugins: [...(generic.jsPlugins ?? []), uiStatePlugin],
  rules: { ...generic.rules, ...reactRules, 'no-restricted-imports': uiStateImports },
  overrides: [
    ...(generic.overrides ?? []).map(withUiStateOverride),
    { files: ['**/*.ts'], rules: { 'react/rules-of-hooks': 'off' } },
    fetchInComponentsOverride,
    ...storyScreenshotOverrides,
  ],
}

export default frontendConfig
