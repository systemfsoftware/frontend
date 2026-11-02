# @systemfsoftware/oxlint-config-frontend@0.1.1

These packages are now verified against effect 4.1.0. The published peer range on `effect` stays `^4`, so no install requirement changes.

A pull atom in `@systemfsoftware/effect-atom` now keeps the longest batch it has delivered: when two concurrent pulls finish out of order, the atom no longer drops back to the shorter batch.

The frontend oxlint preset moved into the frontend repository with its rules unchanged.
