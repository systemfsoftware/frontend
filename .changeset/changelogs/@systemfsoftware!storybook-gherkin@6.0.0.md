# @systemfsoftware/storybook-gherkin@6.0.0

The published `effect` and `@effect/*` dependency ranges now start at 4.0.1 (`^4.0.1`, was `^4`), so a consumer resolves at least Effect 4.0.1. `@systemfsoftware/discern` also bundles `@effect/platform-node` and `@effect/platform-node-shared` 4.0.1 instead of 4.0.0.

The Effect dependency resolved to 4.0.5, and so did every `@effect/*` package installed with it.

- Effect 4.0.5 requires `effect@^4.0.5` as a peer, so a tree mixing 4.0.5 with an earlier 4.0.x fails at import, not at install. Install the versions your tree's `@effect/*` packages name.
- `FileSystem.File.Info` reports `dev`, `ino`, `rdev`, `nlink` and `blocks` as `bigint` where it reported `number`. Convert at your own boundary with `BigInt` or `Number`.
- A decision's `instructions` and its classify and probability `criteria` accept a JSON object or array as well as a string, and a rating's `criteria` are `{ label, description }` entries rather than bare labels. Read a level's `label`, not the entry.

These packages are now verified against effect 4.1.0. The published peer range on `effect` stays `^4`, so no install requirement changes.

A pull atom in `@systemfsoftware/effect-atom` now keeps the longest batch it has delivered: when two concurrent pulls finish out of order, the atom no longer drops back to the shorter batch.

Published dependency ranges now name a full version: `vitest`, `@vitest/*` and `@types/node` ranges start at 5.0.1 and 26.6.2 (were `^5` and `^26`), `typescript` at 7.0.2 (was `^7`) and `playwright` at 1.63.0 (was `^1`). The `vitest` peer dependency of `@systemfsoftware/effect-gherkin-spec`, `@systemfsoftware/effect-schema-law`, `@systemfsoftware/effect-schema-vite`, `@systemfsoftware/effect-spec-runtime`, `@systemfsoftware/storybook-gherkin`, `@systemfsoftware/trace-spec`, `@systemfsoftware/vitest` and `@systemfsoftware/vitest-config` is now `^5.0.1`, so a consumer needs at least Vitest 5.0.1. `@systemfsoftware/trace-spec` depends on `@opentelemetry/semantic-conventions` `^1.43.0` (was `^1.33`).

The packed `devDependencies` range on `@systemfsoftware/oxlint-config-recommended` moves to its new major.

Step contexts now carry `expect`: the assertions of whichever runner the play runs in.

Under Storybook it stays `storybook/test`'s `expect`. In vitest browser mode (through `@storybook/addon-vitest`) it is vitest's own `expect`, so a step handler can reach the matchers only vitest has — `toMatchScreenshot`, `toMatchAriaInlineSnapshot`, `toMatchTextContent` — as `await ctx.expect(locator).toMatchAriaInlineSnapshot(…)`, without importing `vitest` where a project bans that import.

The assertions are promise-shaped: `await` them. `vitest` is an optional peer dependency.

- `DuplicateCapture` carries its capture name in `capture` and `OutlineDuplicateRowName` carries its row name in `rowName`, where both carried it in `name`. A `name` payload field shadows the error's own `name`, so logs showed the field value instead of the error type. Read `capture` or `rowName`.
- Every `Schema.Class`, `TaggedClass` and `TaggedError` the packages export is branded, so two classes with the same shape are no longer assignable to each other.
