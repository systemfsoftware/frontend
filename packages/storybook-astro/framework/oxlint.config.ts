import recommended from '@systemfsoftware/oxlint-config-frontend'
import { defineConfig } from 'oxlint'

// Forked storybook-astro code is plain TypeScript, not Effect cell code: the rules below grade
// Effect idioms, house test naming and house strictness that the upstream code does not follow.
// The unsafe-any, non-null and test-style rules are off until the port is typed; every other rule
// of the recommended preset, including the promise and throw rules, stays on.
export default defineConfig({
  extends: [recommended],
  // The suites build throwaway fixture projects inside the package, while lint may run beside them.
  ignorePatterns: ['.vitest-*/**'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@systemfsoftware/test-discipline/damp-test-naming': 'off',
        '@systemfsoftware/test-discipline/no-test-file-in-src': 'off',
        '@systemfsoftware/test-discipline/vitest-from-systemfsoftware-vitest': 'off',
        '@systemfsoftware/cell-architecture/ban-unknown': 'off',
        '@systemfsoftware/effect-platform/no-unported-time-source': 'off',
        'effecttsgo/strict-boolean-expressions': 'off',
        'effecttsgo/missing-pipeable-signature': 'off',
        'effecttsgo/global-timers': 'off',
        'effecttsgo/new-promise': 'off',
        'effecttsgo/global-date': 'off',
        'effecttsgo/node-builtin-import': 'off',
        'typescript/consistent-type-assertions': 'off',
        'typescript/no-unnecessary-condition': 'off',
        'typescript/strict-boolean-expressions': 'off',
        'eslint/complexity': 'off',
        'eslint/no-restricted-imports': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-call': 'off',
        'typescript/no-unsafe-argument': 'off',
        'typescript/no-unsafe-return': 'off',
        'typescript/no-non-null-assertion': 'off',
        'typescript/no-explicit-any': 'off',
        'typescript/no-unnecessary-type-assertion': 'off',
        'typescript/no-redundant-type-constituents': 'off',
        'typescript/restrict-template-expressions': 'off',
        'typescript/triple-slash-reference': 'off',
        'typescript/ban-ts-comment': 'off',
        'vitest/require-mock-type-parameters': 'off',
        'vitest/no-conditional-in-test': 'off',
        'vitest/valid-expect': 'off',
        'vitest/require-to-throw-message': 'off',
        'vitest/no-identical-title': 'off',
        '@systemfsoftware/cell-architecture/ban-error-string': 'off',
        '@systemfsoftware/cell-architecture/ban-classes': 'off',
        '@systemfsoftware/cell-architecture/no-direct-tag-access': 'off',
        'effecttsgo/process-env': 'off',
        'unicorn/no-useless-fallback-in-spread': 'off',
        'jsdoc/check-tag-names': 'off',
        'eslint/no-unsafe-optional-chaining': 'off',
      },
    },
  ],
})
