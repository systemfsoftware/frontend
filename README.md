# frontend

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/systemfsoftware/frontend/actions/workflows/check.yml/badge.svg)](https://github.com/systemfsoftware/frontend/actions/workflows/check.yml)

`frontend` is the frontend stack for Effect applications. It contains four packages and one reference app that deploys to Cloudflare.

The packages provide reactive atoms over Effect, React bindings for those atoms, Gherkin feature specs as Storybook stories, and an oxlint preset for UI rules. React code on this stack holds server data in atoms over Effect services, performs no I/O in components, and runs no React effects. Those rules live in [compound packs](compound-packs), and the lint preset turns the mechanical ones into errors so a component that breaks them fails the build.

## Packages

| Package                                                                                     | What it is                                                                                                                        |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`@systemfsoftware/effect-atom`](packages/atom/effect-atom)                                 | Reactive toolkit for Effect, forked from [tim-smart/effect-atom](https://github.com/tim-smart/effect-atom). One entry, `Atom`.    |
| [`@systemfsoftware/effect-atom-react`](packages/atom/effect-atom-react)                     | React bindings for it: `RegistryProvider`, `useAtomValue`, and the registry's scheduler. One entry, `AtomReact`.                  |
| [`@systemfsoftware/storybook-gherkin`](packages/gherkin/storybook-gherkin)                  | Gherkin Given/When/Then embedded in Storybook CSF, with typed captures and scenario outlines, run as browser-mode play functions. |
| [`@systemfsoftware/oxlint-config-frontend`](packages/oxlint-presets/oxlint-config-frontend) | The `@systemfsoftware/oxlint-config-recommended` preset plus the React rules and the ui-state and storybook-testing bans.         |

All four packages are Apache-2.0 and require `effect` 4 as a peer. `effect-atom-react` also requires `react` and `react-dom`, and `storybook-gherkin` requires `storybook` 10 or later and `vitest`.

## Install

These packages are not on npm. This repository ships them as flake outputs, and each push to `main` pushes their tarballs to [nix.systemfsoftware.com](https://nix.systemfsoftware.com). Consumers add this flake as an input and fetch the tarballs through [pnpm-release-management](https://github.com/systemfsoftware/pnpm-release-management#distribution-through-nix). Nix downloads pushed tarballs and builds the rest from source.

### Add the flake as an input

```nix
{
  nixConfig = {
    extra-substituters = "https://nix.systemfsoftware.com";
    extra-trusted-public-keys = "nix-cache-1:wXA8I4DayNW9q6enUyQA/P/nT38pGSTLt374t3gsn7M=";
  };
  inputs = {
    nixpkgs.follows = "producer/nixpkgs";
    producer.url = "github:systemfsoftware/frontend/<rev>";
    pnpm-release-management.url = "github:systemfsoftware/pnpm-release-management";
  };
}
```

### Build the tarballs and the pnpm store

```nix
packages = forEachSystem (pkgs: rec {
  producer-tarballs = pnpm-release-management.lib.mkProducerTarballs {
    inherit pkgs;
    producers = { inherit producer; };
  };
  pnpm-store = pnpm-release-management.lib.mkPnpmConsumerStore {
    inherit pkgs;
    src = self;
    files.".deps" = producer-tarballs;
  };
});
```

The flake exposes `effect-atom`, `effect-atom-react`, `storybook-gherkin`, and `oxlint-config-frontend`, plus `workspace-tarballs` with all four. Peer dependencies install from npm as usual.

## Atoms in React

An atom holds a value, a registry holds the atoms, and a component reads one through `useAtomValue`. The code that mounts the app owns the registry. It creates the registry before the first render and disposes of it at teardown.

```ts
import { Atom } from '@systemfsoftware/effect-atom'
import { AtomReact } from '@systemfsoftware/effect-atom-react'

const count = Atom.make(0)
const registry = Atom.Registry.make({ scheduleTask: AtomReact.scheduleTask })

// inside a component under <AtomReact.RegistryProvider registry={registry}>
const value = AtomReact.useAtomValue(count)
```

Saved state, islands, and the rest of the registry's lifecycle are in the [`effect-atom-react` README](packages/atom/effect-atom-react#readme).

## Feature specs as stories

`storybook-gherkin` writes a story as a scenario. Steps carry typed captures, and a scenario outline expands one set of steps over a table of examples.

```ts
import { capture, feature, Given, Then, When } from '@systemfsoftware/storybook-gherkin'
import { expect } from 'storybook/test'

const f = feature({}, {})

export default { ...f, title: 'StorybookGherkin/Greeting', render: () => null }

export const AliceReceivesAGreeting = f.scenario(
  'Alice receives a greeting that names her',
  { with: { user: 'alice', greeting: 'Hello, alice' } },
  Given`the user ${capture('user')} has an account`(() => {}),
  When`the system greets ${capture('user')}`(() => {}),
  Then`the greeting mentions ${capture('user')} and reads "${capture('greeting')}"`(
    (_ctx, caps) => {
      void expect(caps.greeting).toContain(caps.user)
    },
  ),
)
```

The story suite in [`test/browser/spec.stories.ts`](packages/gherkin/storybook-gherkin/test/browser/spec.stories.ts) is the package's own browser test and includes this scenario.

## Lint rules for UI code

`oxlint-config-frontend` extends the recommended preset with the oxlint React plugin and four UI bans. The React plugin enables every `correctness` rule at error level, including the React Compiler checks and the Rules of Hooks.

| Rule                                                      | What it refuses                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ui-state/server-data-lives-in-atoms`                     | Imports of React server-state libraries (`@tanstack/react-query`, `swr`, `urql`, `@apollo/client/react` and others). |
| `ui-state/components-perform-no-io`                       | `fetch`, including `globalThis.fetch`, `window.fetch` and `self.fetch`, in a `.tsx` module.                          |
| `ui-state/react-runs-no-effect`                           | `useEffect`, `useLayoutEffect`, `useInsertionEffect` and `useEffectEvent` imported from `react`.                     |
| `storybook-testing/visual-evidence-comes-from-the-runner` | `page.screenshot` in a story file.                                                                                   |

### Use the preset

Extend it from `oxlint.config.ts`:

```ts
import recommended from '@systemfsoftware/oxlint-config-frontend'
import { defineConfig } from 'oxlint'

export default defineConfig({ extends: [recommended] })
```

The rules behind these bans, with the incidents that led to them, are in [`compound-packs/ui-state`](compound-packs/ui-state) and [`compound-packs/storybook-testing`](compound-packs/storybook-testing).

## The reference site

[`apps/site`](apps/site) is one Cloudflare Worker serving a TanStack Start site. It calls its Worker through `effect/rpc` over one D1 database, and Alchemy defines and deploys it. The home page shows the Worker's health, and `/guestbook` is a guestbook with moderation. Every page response carries a Content Security Policy with a per-request nonce, which [`apps/site-e2e`](apps/site-e2e) checks in a real Chromium. The site does not import the packages above. Running it, the guestbook, and deploys are in [docs/site.md](docs/site.md).

## Documentation

- [docs/site.md](docs/site.md): running and deploying the reference site, and its CI credentials
- [compound-packs/ui-state](compound-packs/ui-state): how a React application holds state
- [compound-packs/storybook-testing](compound-packs/storybook-testing): how stories test the UI
- [CONTRIBUTING.md](CONTRIBUTING.md): development setup, checks, and pull requests

## Contributing

Development setup and workflow: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
