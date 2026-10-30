---
"@systemfsoftware/effect-atom-react": patch
"@systemfsoftware/effect-atom": patch
"@systemfsoftware/storybook-gherkin": patch
---

The Effect dependency resolved to 4.0.5, and so did every `@effect/*` package installed with it.

- Effect 4.0.5 requires `effect@^4.0.5` as a peer, so a tree mixing 4.0.5 with an earlier 4.0.x fails at import, not at install. Install the versions your tree's `@effect/*` packages name.
- `FileSystem.File.Info` reports `dev`, `ino`, `rdev`, `nlink` and `blocks` as `bigint` where it reported `number`. Convert at your own boundary with `BigInt` or `Number`.
- A decision's `instructions` and its classify and probability `criteria` accept a JSON object or array as well as a string, and a rating's `criteria` are `{ label, description }` entries rather than bare labels. Read a level's `label`, not the entry.
