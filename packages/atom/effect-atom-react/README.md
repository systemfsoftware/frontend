# @systemfsoftware/effect-atom-react

React bindings for effect-atom — forked under systemfsoftware from tim-smart/effect-atom.

## Install

```sh
pnpm add @systemfsoftware/effect-atom-react 'effect@^4' 'react@^19.2.8' 'react-dom@^19.2.8' 'scheduler@*'
```

Those are peer dependencies: this package declares them but does not install them, so one copy is shared with the rest of your project.

## Entry points

One entry, one namespace:

```ts
import { AtomReact } from '@systemfsoftware/effect-atom-react'

// inside a component under <AtomReact.RegistryProvider registry={registry}>
const value = AtomReact.useAtomValue(count)
```

## Owning the registry

The code that mounts the app owns its registry: an app's entry, an island's module, a per-request server handler, or a Storybook story's loader. It creates the registry before the first render, passes it to `RegistryProvider`, and disposes it when that owner ends. A registry that lives as long as the page is never disposed (see Islands). `RegistryProvider` only provides the registry it is given.

```ts
import { Atom } from '@systemfsoftware/effect-atom'
import { AtomReact } from '@systemfsoftware/effect-atom-react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

const registry = Atom.Registry.make({ scheduleTask: AtomReact.scheduleTask })
const root = createRoot(container)
root.render(createElement(AtomReact.RegistryProvider, { registry }, createElement(App)))

// at teardown
root.unmount()
Atom.Registry.dispose(registry)
```

Pass `scheduleTask: AtomReact.scheduleTask` so registry work runs at React's low priority. Without it, the registry runs work on the host's own dispatcher.

Create the registry outside render. React keeps no state for a render that suspended before its first mount and retries it from scratch, so a registry created during render is rebuilt on every retry and never disposed. Unmounting the root disposes nothing; the owner's `Atom.Registry.dispose` does. An owner that runs inside an Effect can compose `Atom.Registry.layer` instead, which disposes the registry when its scope closes.

## Restoring saved state before the first render

Saved data reaches a registry before the first render; the binding never writes saved data. `Atom.Hydration.hydrate` assigns the saved value to each atom the state names and replaces a value the registry already holds, so the owner restores saved state before the first render, while those atoms have not been read yet; a registry that already holds one of them is not a hydrate target.

The owner writes it in one of three forms, before `hydrateRoot` or `createRoot(...).render`:

1. **Seeds.** `Atom.Registry.make({ initialValues, scheduleTask: AtomReact.scheduleTask })` for typed values the owner already holds, such as an app entry's Layer choice or a story's fakes.
2. **Saved state.** `Atom.Hydration.hydrate(registry, state)` on state the server produced with `Atom.Hydration.dehydrate`. On the server, each request makes, hydrates and disposes its own registry.
3. **Routed apps.** The router's own hydrate option, run before render.

One write happens later, outside React: an entry the server dehydrated while still pending (`encodeInitialAs: 'deferred'`) is completed when the server's promise resolves. It finishes the same server render rather than delivering a second saved page, and components see it through their subscription like any other update.

## Islands

An island that takes no server-data props makes its registry at module scope, `Atom.Registry.make({ scheduleTask: AtomReact.scheduleTask })`, and its root component renders `RegistryProvider` with it. The module is imported before the framework creates the island's root, so the registry exists before any render, and every instance of the island on the page shares it.

- **Props.** A supported island seeds no atom from its props: props exist only inside the island's first render. Its server data comes through atoms over the app runtime's services. Props that seed nothing, such as a label or an id, are fine.
- **Server render.** When the island is also rendered on the server, its module-scope registry is shared by every request in that process. Every atom the island reads during a server render carries `Atom.withServerValue` with a request-independent value, or `Atom.withServerValueInitial` for a result atom; otherwise render it client-only.
- **Teardown.** An island's registry lives as long as the page, and nothing disposes it: a dispose on `unload` or `beforeunload` makes the page ineligible for the back/forward cache, and a restored page would hold a disposed registry. When a client-side navigation unmounts the island, each atom it no longer reads is released and its fiber interrupted; a `keepAlive` atom stays in the registry for the next page that mounts the island. No island calls `Atom.Registry.dispose`.

## Several roots sharing one runtime

A page with several independently mounted React roots, such as an island architecture, shares one registry and one built runtime Layer by owning both at module scope, in a module every root imports:

```ts
import { Atom } from '@systemfsoftware/effect-atom'
import { AtomReact } from '@systemfsoftware/effect-atom-react'

export const registry = Atom.Registry.make({ scheduleTask: AtomReact.scheduleTask })

export const runtime = Atom.keepAlive(Atom.context()(AppLayer))
export const gateway = runtime.atom(Gateway.use((service) => Effect.succeed(service)))
```

Every root renders `<AtomReact.RegistryProvider registry={registry}>` with that registry.

- **Why the registry is shared.** `Atom.context()` with no options scopes its memo map to each registry, so a Layer is built once per registry. Roots on different registries build it once each; roots on one registry build it once.
- **Why the runtime atom is kept alive.** A runtime atom is released when its last subscriber goes. Without `Atom.keepAlive`, the page's first root unmounting drops the subscriber count to 0, the Layer's scope closes, and the next root to mount rebuilds it. `Atom.keepAlive(runtime)` keeps the runtime in the registry, and every atom made from it (`runtime.atom`, `runtime.fn`, and the rest) reads that kept-alive runtime, so a later root receives the same service instance.
- **Why there is no module-level memo map.** `Atom.context({ memoMap })` would share built Layers across every registry, including the fresh one a test or Storybook story makes and disposes per case, so a disposed registry's Layer would leak into the next case. Leave `memoMap` unset: a registry made per case still builds, and on `Atom.Registry.dispose` releases, its own Layer.

Never dispose the shared registry; its lifetime is the page's, as in Islands. A test or story does not import the shared registry; it makes its own, disposes it in its own cleanup, and reads the same atoms through it.

## API

The public surface is generated from the source and versioned with the package: [`etc/effect-atom-react.api.md`](./etc/effect-atom-react.api.md).

## License

Apache-2.0. Part of [systemfsoftware](https://github.com/systemfsoftware/systemfsoftware/tree/main/packages/effect-atom/atom-react#readme).
