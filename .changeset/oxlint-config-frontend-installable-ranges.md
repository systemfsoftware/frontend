---
"@systemfsoftware/effect-atom": patch
"@systemfsoftware/effect-atom-react": patch
"@systemfsoftware/storybook-gherkin": patch
"@systemfsoftware/oxlint-config-frontend": patch
---

Depend on caret ranges of `@systemfsoftware` packages that npm serves, so every package installs from the registry; `oxlint-config-frontend` no longer pins `oxlint-config-recommended` to a version npm does not publish.
