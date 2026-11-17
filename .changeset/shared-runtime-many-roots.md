---
"@systemfsoftware/effect-atom-react": patch
---

Documents how a page with several independently mounted React roots, such as an island architecture, shares one registry and one built runtime Layer: own the registry at module scope, pass it to every root's `RegistryProvider`, and wrap the atoms read from the runtime in `Atom.keepAlive` so unmounting a root does not release the Layer. No API changed.
