---
title: Storybook Astro Rewrite - Plan
type: feat
date: 2026-11-18
topic: storybook-astro-rewrite
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
---

# Storybook Astro Rewrite - Plan

## Goal Capsule

- **Objective:** `@systemfsoftware/storybook-astro-framework` and `@systemfsoftware/storybook-astro-renderer` render real `.astro` components as Storybook stories, meet this repository's full standard with no rule relaxed for them, are licensed Apache-2.0 with no upstream notice, and are released from this repository for downstream Astro sites to consume.
- **Means:** a full rewrite of both packages, replacing the snapshot of storybook-astro 1.17.0 (upstream commit `ef554bb2f888f138574045c1ddae5ec233b75f5c`, MIT) held in `packages/storybook-astro/`.
- **Product authority:** the repository maintainers. `AGENTS.md`, `CONSTITUTION.md`, the shared lint preset and the enrolled compound packs set the standard; this plan cites them rather than restating them.
- **Open blockers:** the supported version ranges and integrations to keep (see Resolve Before Planning).
- **Stop condition:** this plan is a requirements document. Planning and implementation start only after review.

## Product Contract

### Summary

Rewrite both packages from their behaviour so they pass the repository's gates with no per-package relaxation. Keep every behaviour the snapshot ships unless it is named as dropped. License the result Apache-2.0 with no NOTICE, prove it with a CI test that renders a real `.astro` story, and release both packages.

### Problem Frame

The snapshot makes `.astro` stories work on Astro 7, Vite 8 and Storybook 10.6, but it was written to a different standard. Each package's `oxlint.config.ts` turns off 40 rules the rest of the repository keeps on (`packages/storybook-astro/framework/oxlint.config.ts`, `packages/storybook-astro/renderer/oxlint.config.ts`). Linted against the unmodified preset, the two packages produce 3,652 findings across 148 files: 2,929 in the framework, 723 in the renderer, 1,430 of them in tests. The largest families are `strict-boolean-expressions`, `damp-test-naming`, `ban-unknown`, `consistent-type-assertions`, `complexity` and `no-restricted-imports` on Node built-ins.

Moving those disables into the shared preset, a root override or an ignore pattern would hide the same findings, and `STRATEGY.md` rules out any opt-out or `warn` severity. The upstream code is also MIT-licensed, so the packages carry a NOTICE and a mixed-license story for as long as any of it remains.

The consumer is a public Astro site. Its `.astro` page components and React islands need stories, and its maintainers want Storybook's accessibility checks to replace a separate accessibility CI job once stories render `.astro` components.

### Key Decisions

- **Full rewrite, not a cleaned-up fork.** Governs R1, R2, R4–R11. (session-settled: user-directed — chosen over keeping the upstream code behind lint-config disables: the disables are the defect.)
- **Apache-2.0 for both packages.** Governs R28. (session-settled: user-directed — chosen over keeping MIT or a mixed-license pair: one license, the repository's own.)
- **The NOTICE and MIT text go once the rewrite is complete.** Governs R29, R30. (session-settled: user-directed — chosen over keeping the NOTICE alongside the rewrite: a rewrite carries no upstream expression to attribute.)
- **The enrolled packs are the compound packs of `systemfsoftware/systemfsoftware` at `main`, every pack.** Governs the pack citations throughout. (session-settled: user-directed — chosen over the pack folders under this repository's own `compound-packs/`: those are not enrolled.)
- **`effect` becomes a peer dependency of both packages.** The preset bans `new Promise`, global timers, `process.env` and Node built-in imports, so passing it needs Effect and its platform services at runtime. A consumer installs `effect` 4 alongside Storybook and Astro. Governs R4, R8.
- **The real-render proof runs the built packages through their published entries in a real browser.** A source-level test cannot show that the shipped build works. Governs R22–R24.
- **Stories prove the component and island level of the downstream accessibility job, not the built-page level.** The page-accessibility pack keeps built-page checks (landmarks, headings, colour scheme, sticky header) outside what a story can see. See Outstanding Questions. Governs R24.

### Requirements

**Lint and gates**

- R1. Each package's `oxlint.config.ts` extends the shared preset and nothing else, as `packages/atom/effect-atom/oxlint.config.ts` does: no rule turned off or lowered, no override, no `ignorePatterns`, no inline suppression. (pack: check-hygiene, a-lint-rule-enforces-a-decision-it-never-makes-one.md)
- R2. The shared preset, root lint and TypeScript configuration, and CI workflows are not edited to make either package pass; any change to them lands apart from this work. (pack: check-hygiene, a-lint-rule-enforces-a-decision-it-never-makes-one.md; `AGENTS.md` Boundaries; CONST-E7)
- R3. On the pushed head, `format:check`, `lint`, `lint:tsgo`, `lint:suppressions`, `typecheck`, `test` and `attw` pass for both packages. Neither package defines `lint:tsgo` today; both gain it, as `packages/gherkin/storybook-gherkin` has it.

**Code shape**

- R4. Decisions are pure and live in the file kinds the repository names. Effects sit at the edges as values, and each third-party callback (a Storybook preset hook, a Vite plugin hook) only hands its input to Effect code. (CONST-B1, CONST-B4; pack: cell-architecture, file-kinds.md)
- R5. A distinct failure is a tagged error variant, and mutually exclusive states are a tagged union, never an optional-field record or an error string. (CONST-D2, CONST-D4; pack: schema-modelling, states-are-tagged-unions.md)
- R6. A value a consumer or host supplies (framework options, Storybook and Vite payloads, render requests and replies, docgen output) is decoded once at its edge by a schema that declares the wire shape as sent and carries the domain rule, and nothing downstream re-checks it. (pack: schema-modelling, foreign-wire-shapes-are-the-encoded-side.md, invariants-live-in-the-schema.md)
- R7. No module holds mutable state. A cache, registry or memo table belongs to a service instance a Layer builds; the source files that today declare module-level `Map`, `Set` or `WeakMap` bindings (11) or a module-level `let` (6) are redesigned, not annotated. (pack: effect-architecture, instance-state-lives-in-the-constructor.md)
- R8. A third-party driver (Astro, Vite, the TypeScript compiler, a UI-framework plugin) loads inside the adapter's Layer, and a service module names its types with `import type` only. (pack: effect-architecture, adapters-load-their-driver-when-their-layer-builds.md, adapters-are-named-for-their-driver.md)
- R9. A library Layer is named `layer` or `layerConfig`, and layers are built and provided once at the composition root, never inside a decision or a hook body. (pack: effect-architecture, layers-are-named-layer-and-layerConfig.md, services-are-provided-once-at-the-composition-root.md)
- R10. A live instance a program acquires (a Vite server, an Astro container, a render daemon) is a scoped handle released by its scope, never a service or a value its caller must close. (pack: cell-architecture, handles-are-scoped-values.md, scopes-close-at-the-run-edge.md)
- R11. Text a decision produces for a reader (generated Astro source for the docs panel, canvas messages) comes from a pure formatter called after the decision, never from the decision. (pack: cell-architecture, presentation-is-a-formatter-the-write-phase-calls.md)
- R12. Environment variables are described `Config`s declared once, reaching code only through a `<Feature>Config` in context. The render-server token is `Redacted`, a switchable feature (sanitization) is an enabled-or-disabled union that reads its other settings only when on, and the 6 source files that read `process.env` today stop. (pack: configuration, each-environment-variable-is-one-described-config.md, settings-reach-code-through-context.md, secrets-are-decoded-as-redacted.md, a-switched-off-feature-reads-none-of-its-settings.md)

**Behaviour kept**

- R13. Every behaviour the snapshot ships stays unless Scope Boundaries names it as dropped:
  - rendering through Astro's Container API with props and slots, scoped styles, client directives and hydration;
  - live preview with hot reload, static builds that pre-render Astro stories, and the server render mode with its token authentication;
  - args and slot sanitization, story rules and module mocking;
  - portable stories and the Vitest helpers, docgen of Astro props into controls, generated source for the docs panel, and decorators;
  - the React, Vue, Svelte, Preact, Solid and Alpine.js integrations, `astro:assets` and Astro fonts support, and the render loading indicator.

**Published surface**

- R14. Every entry in either `exports` map has a named consumer that imports it. The renderer's per-module subpaths that mirror source files today (`./decoratedTree`, `./slotArgs`, `./storyStyles`, `./extractArgTypes`, `./preview-defaults`, `./decorators`, `./generateAstroSource`) stay only if one does. (pack: package-surface, subpaths-serve-consumers.md)
- R15. A symbol is importable under one name from one entry, and nothing is exported for a test. (pack: package-surface, one-name-one-entry.md; testing, tests-reach-only-the-published-surface.md)

**Tests**

- R16. Tests reach each package only through its published entries and live under `tests/`; only laws about a pure module stay in source. The 53 test files beside source today (11,881 lines) are rewritten, not moved. (pack: testing, tests-reach-only-the-published-surface.md)
- R17. Expected values come from the requirement as a story author or consumer meets it, never from the code under test, a snapshot or a recording, and a failing test is fixed in the code. (CONST-T10; pack: testing, expected-values-come-from-the-requirement.md, failing-tests-are-fixed-not-weakened.md)
- R18. No test replaces a platform driver, binding or runtime object with `vi.mock`, `vi.fn`, `vi.spyOn` or a hand-built object (17 of the 53 files use `vi.mock`, `vi.fn` or `vi.spyOn` today), and no test writes to the host: the fixture projects that docgen and render tests create inside the package directory are replaced by in-memory or in-process fixtures. (pack: testing, adapters-run-against-real-local-resources.md, io-runs-in-microvms-never-on-the-host.md)
- R19. Each pure decision (sanitization, args reconstruction, story-rule matching, slot arguments, docgen defaults and prop filtering, date revival) has properties whose inputs are drawn from its schema, whose oracles come from the contract, whose boundaries are built, and each of which is shown failing against a named wrong implementation in the pull request description. (pack: property-testing, drawn-values-reach-the-decision.md, oracles-are-independent-of-the-code-under-test.md, boundaries-and-collisions-are-constructed.md, properties-are-shown-to-fail.md)
- R20. Configuration is neither tested nor gated, and tests supply settings through context. (pack: testing, configuration-gets-no-test-and-no-gate.md; configuration, tests-supply-settings-and-never-mirror-them.md)
- R21. Decision modules are enrolled in on-demand mutation testing as the other workspace packages are, and a survivor is killed or its code deleted. Mutation is not part of CI (`STRATEGY.md`). (pack: testing, surviving-mutants-are-killed-or-their-code-deleted.md)

**Real-render proof**

- R22. A test that CI runs renders a story for a real `.astro` component through the built framework and renderer, in a real browser, and asserts what a person sees using role, label or text queries. No simulated DOM. (CONST-T8; pack: ui-testing, stories-are-the-ui-tests.md, queries-are-accessible.md)
- R23. The fixture components are written for this repository about a generic subject, take their data as args and slots, and reach no I/O. (pack: public-repository, material-is-invented-generated-or-public.md; ui-testing, stories-get-io-from-stand-ins-beside-the-io-module.md)
- R24. The same run applies accessibility checks to each fixture story, including a hydrated React island inside an `.astro` component, and a violation fails the run. (pack: page-accessibility, islands-are-proven-by-stories-and-in-the-built-page.md)
- R25. Dev, static-build and server render modes each render a story against the shipped build; a mode that needs real processes follows the end-to-end pack. (CONST-T8; pack: e2e-testing, e2e-is-its-own-package-on-real-processes.md)
- R26. The proof runs under a task the existing CI workflow already runs, and this work edits no workflow (`AGENTS.md` Boundaries; `.github/workflows/ci.yml`).
- R27. Every failure or waiting state the renderer shows in the Storybook canvas says what happened and what the story author can do next, never raw error text. (pack: screen-content, failure-states-say-what-happened-and-what-to-do.md)

**License and provenance**

- R28. Both packages are Apache-2.0: the `license` field and the `LICENSE` file of each say so.
- R29. When the rewrite is complete, both `NOTICE` files, the MIT text, and every statement that the packages are a fork or carry upstream code are removed from manifests, READMEs, `files` lists and `packages/storybook-astro/AGENTS.md`.
- R30. The rewrite contains no upstream-authored expression: no carried file, function body, test, comment or documentation text. A per-file overlap check against the snapshot commit shows it, reported in the pull request description and not by a CI check, and R29 lands only after it. (pack: check-hygiene, ci-never-grades-the-repository-itself.md)
- R31. Nothing private appears in any file, fixture, commit message or pull request text. (pack: public-repository, names-are-public-or-placeholders.md, people-and-paths-are-placeholders.md, material-is-invented-generated-or-public.md)

**Release**

- R32. One change intent names both packages at the class the surface change sets, the shared release workflow versions and tags them, and `attw` passes on the packed output. (pack: package-surface, surface-changes-are-versioned.md; `release.jsonc`)
- R33. Each manifest is release-ready: a real author, a description with no fork wording, repository and homepage pointing here, no `NOTICE` in `files`, and peer ranges limited to the versions the tests run against. Both manifests carry `author: "TODO <todo@example.com>"` today.
- R34. Publishing happens only after the maintainers confirm it (`AGENTS.md` Boundaries), and the packages exist on the registry at the released version.

### Enrolled Pack Coverage

Every pack in the enrolled source was read at its `main` head. Packs that apply are cited on the requirement they shaped.

| Pack                | Applies       | Where or why not                                                                                               |
| ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| cell-architecture   | Yes           | R4, R10, R11                                                                                                   |
| check-hygiene       | Yes           | R1, R2, R30                                                                                                    |
| configuration       | Yes           | R12, R20                                                                                                       |
| design-system       | No            | Concerns apps that render the Astryx component library; neither package does                                   |
| e2e-testing         | Conditionally | R25, for any mode that needs real processes                                                                    |
| effect-architecture | Yes           | R7, R8, R9                                                                                                     |
| package-surface     | Yes           | R14, R15, R32                                                                                                  |
| page-accessibility  | Partly        | R24 (islands); the built-page suite belongs to the consumer site                                               |
| property-testing    | Yes           | R19                                                                                                            |
| public-repository   | Yes           | R23, R31                                                                                                       |
| schema-modelling    | Yes           | R5, R6                                                                                                         |
| screen-content      | Narrowly      | R27, the canvas states only; the pack's claims and sample-data rules concern product screens                   |
| testing             | Yes           | R16, R17, R18, R20, R21                                                                                        |
| ui-state            | No            | Concerns effect-atom applications; the preset's React rules still judge the renderer's `.tsx` files through R1 |
| ui-testing          | Yes           | R22, R23                                                                                                       |

### Actors

- A1. Story author: the developer of an Astro site who writes and runs stories for `.astro` components and islands.
- A2. Maintainer: reviews the rewrite, confirms the release.

### Key Flows

- F1. Adopting the framework
  - **Trigger:** A1 has an Astro 7 site and wants stories.
  - **Steps:** A1 installs the two packages and their peers, points `.storybook/main` at the framework, writes a story for an `.astro` component and runs dev, build or the story test run.
  - **Outcome:** The story renders the component's markup and styles, an island hydrates, and the accessibility checks report.
  - **Covered by:** R13, R22, R24, R25
- F2. Reviewing the rewrite
  - **Trigger:** A2 opens the pull request that completes the rewrite.
  - **Steps:** A2 reads the lint configs, the overlap check, the wrong-implementation evidence for each property and the green CI run; then confirms the release.
  - **Outcome:** Both packages are versioned, tagged and published.
  - **Covered by:** R1, R19, R30, R32, R34

### Acceptance Examples

- AE1. **Covers R1, R2.** Given a head where either package's lint config adds one `'off'`, an `ignorePatterns` entry or an inline suppression, when the work is judged, it is not done, however green CI is.
- AE2. **Covers R22.** Given a fixture `.astro` card taking a title arg and a body slot, when its story runs through the built framework in a real browser, then the play function finds a heading by role with the title as its name and the body text by text.
- AE3. **Covers R24.** Given the same card with an image that has no text alternative, when the story runs, then the accessibility check fails the run. The pull request shows this once; the broken fixture is not committed.
- AE4. **Covers R29, R30.** Given the final head, when the package directories are searched for `NOTICE` and for the MIT license text, then neither is found, and the pull request description holds an overlap check against the snapshot commit showing no carried expression.

### Success Criteria

- CI on this repository is green on a head where neither package's lint config disables anything beyond the shared preset (R1–R3).
- A test in CI renders a real `.astro` component story through the framework (R22–R26).
- Both packages are released from this repository (R32–R34).

### Scope Boundaries

**Deferred for later**

- Moving the downstream site's stories onto these packages and retiring its separate accessibility CI job. It depends on the release and is separate work.
- Behaviour that upstream's design notes describe but the snapshot does not ship: the Astro panel addon and the scaffold CLI.

**Outside this plan**

- Editing the shared lint preset, rules, CI workflows or gates (R2).
- The downstream built-page accessibility suite (pack: page-accessibility, README.md).
- Upstream's website, example apps and integration projects.
- Running mutation tests (on demand, never in CI or on a development host).
- Dropped behaviour: none named yet. Any entry added here names the behaviour and its reason; Resolve Before Planning asks which.

### How This Work Fits Together

<!-- ce-section: work-relationships -->

This plan covers the rewrite and the release of the two packages. The relationships below are the current understanding, not a committed roadmap.

- Downstream adoption in the consumer site
  - Depends on this plan's release.
  - Still to decide: how much of that site's accessibility job stories can replace (see Outstanding Questions).

### Dependencies / Assumptions

- The catalog pins Astro 7.4.8, Vite 8.3.4, Storybook 10.6.2, Vitest 5.0.5 and `@storybook/addon-vitest` 10.6.2 (`pnpm-workspace.yaml`). It has no accessibility addon entry, so R24 adds one.
- The framework pins `typescript` 6.0.3 because docgen needs TypeScript's JavaScript compiler API, which TypeScript 7 does not ship (`packages/storybook-astro/AGENTS.md`). The rewrite keeps docgen working under that pin.
- `.github/workflows/ci.yml` runs `turbo run format:check lint typecheck test` on a full run. `test:browser` runs only under `pnpm check:ci` through `gate:tasks`.
- Neither package is on the npm registry (it returns 404 for both names), so the surface change is evaluated against nothing released.
- This repository has no `CODING_STANDARDS.md`. The standard is `AGENTS.md`, `CONSTITUTION.md`, `STRATEGY.md`, the shared lint preset and the enrolled packs.

### Outstanding Questions

**Resolve Before Planning**

- Which supported ranges and integrations does the rewrite keep? The snapshot supports Astro 5.5.3+, 6 and 7, Vite 6.4.1+, 7 and 8, Storybook 10 and 11 beta, and six UI integrations. The repository exercises only Astro 7, Vite 8, Storybook 10.6 and React, and R13 and R25 require a real-render proof for everything kept. Recommendation: keep what the repository can test (Astro 7, Vite 8, Storybook 10.6, React and Astro components) and name the rest in Scope Boundaries as dropped, to be restored by a later change that brings its own proof.

**Deferred to Planning**

- Which lane carries the real-render proof, given that CI runs `test` and not `test:browser`, and how the testing pack's no-host-process rule applies to a Storybook build run for it (R18, R22, R26).
- Where the single Effect runtime lives for entries a host invokes outside Effect (Storybook's preset loader, Vite plugin hooks), within the effect-architecture pack's host-invoked composition root exception (R4, R9).
- Whether server render mode needs an end-to-end package of its own or can be proven in-process (R25).
- Which of the 21 current entries (9 framework, 12 renderer) have a consumer (R14).
- The first released version. The manifests inherit upstream's 1.17.0 line, which no longer describes the code; the package-surface pack says a version below 1.0.0 never lowers the bump class. A maintainer decides before the release (R32).
- How much of the downstream accessibility job stories can replace. Stories cover components and islands with axe; the page-accessibility pack keeps checks for landmarks, one `h1`, colour scheme, forced colours, focus under a sticky header and reflow in a built-page suite that stories cannot see. A maintainer decides whether the downstream job shrinks or is replaced in part.
- Which accessibility addon and any other net-new dependency the rewrite adds, with the registry and maintainer vetting the repository requires (R24).

### Sources / Research

- Enrolled packs: `https://github.com/systemfsoftware/systemfsoftware`, `compound-packs/`, read at `main` head `50853229739c544db221d10b2edc3bd9e5228c4e`, as enrolled by `.compound-engineering/config.yaml`. The folders under this repository's own `compound-packs/` are not enrolled and are not cited.
- Repository standard: `AGENTS.md`, `STRATEGY.md`, `CONSTITUTION.md`, `oxlint.shared.ts`, `packages/oxlint-presets/oxlint-config-frontend/src/index.ts`, `turbo.json`, `.github/workflows/ci.yml`, `release.jsonc`, `pnpm-workspace.yaml`.
- Snapshot under rewrite: `packages/storybook-astro/framework` and `packages/storybook-astro/renderer`, together 114 non-test source files (15,995 lines) and 53 test files (11,881 lines).
- Sibling bar: `packages/atom/effect-atom/oxlint.config.ts` (preset only) and `packages/gherkin/storybook-gherkin` (story suite run by the Storybook Vitest addon).
- Upstream behaviour list: the upstream README at the snapshot commit (features, render modes, sanitization, story rules, framework integrations).
