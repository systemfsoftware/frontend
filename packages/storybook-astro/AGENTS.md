# AGENTS.md — `@systemfsoftware/storybook-astro-framework` and `-renderer`

Root `AGENTS.md` governs. These two packages are a fork of storybook-astro (https://github.com/storybook-astro/storybook-astro), taken at upstream commit `ef554bb2f888f138574045c1ddae5ec233b75f5c` (v1.17.0) without its history, the way `packages/atom` is. The upstream code is MIT; `NOTICE` carries that notice and our changes are Apache-2.0.

The code is plain TypeScript, not Effect cell code. Each package's `oxlint.config.ts` extends the frontend preset and turns off the Effect-idiom, house-test-naming and type-strictness rules the upstream code was not written to; the promise, throw and suppression rules stay on. Tighten by removing a rule from that list once the code passes it, never by adding an inline suppression.

`typescript` is pinned to 6.0.3 in the framework: docgen needs TypeScript's JavaScript compiler API, which TypeScript 7 does not ship (docgen then skips with a warning).
