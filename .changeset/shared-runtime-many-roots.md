---
"@systemfsoftware/effect-atom": patch
"@systemfsoftware/effect-atom-react": patch
---

`Atom.keepAlive`, `Atom.setIdleTTL`, `Atom.withLabel` and every other configuration step applied to a runtime atom now return a runtime whose `atom`, `fn`, `pull` and `subscriptionRef` members read that returned runtime, and each runtime keeps the same member functions on every read. Before, they read the runtime `Atom.context()` first returned, so `Atom.keepAlive(Atom.context()(layer))` did not keep the Layer alive.

The React README documents how a page with several independently mounted roots, such as an island architecture, shares one registry and one built runtime Layer.
