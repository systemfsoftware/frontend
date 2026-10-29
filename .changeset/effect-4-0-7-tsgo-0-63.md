---
"@systemfsoftware/effect-atom-react": patch
"@systemfsoftware/effect-atom": patch
"@systemfsoftware/storybook-gherkin": minor
---

The Effect dependency now resolves to 4.0.7, and so does every `@effect/*` package installed with it.

- `DuplicateCapture` carries its capture name in `capture` and `OutlineDuplicateRowName` carries its row name in `rowName`, where both carried it in `name`. A `name` payload field shadows the error's own `name`, so logs showed the field value instead of the error type. Read `capture` or `rowName`.
- Every `Schema.Class`, `TaggedClass` and `TaggedError` the packages export is branded, so two classes with the same shape are no longer assignable to each other.
