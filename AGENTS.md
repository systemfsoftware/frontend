# starter

Starter template for TypeScript / Effect libraries and tools.

## Boundaries

| Surface            | Examples                                     | Limit                                                  |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| **Evaluator**      | `commitlint.config.ts`, `.github/workflows/` | Read-only; never edit the instrument that grades work. |
| **Doctrine**       | `CONSTITUTION.md`, `subtrees.toml`           | Project law; edit only on deliberate direction.        |
| **Vendored**       | `repos/**`                                   | Read-only; updated via git subtree, never hand-edited. |
| **Human approval** | Releases, publishing, external credentials   | User-confirmed only.                                   |
| **Editable**       | Workspace source, tests, documentation       | Edit freely.                                           |

## Definition of Done

| ID        | Rule                                                | Gate                |
| --------- | --------------------------------------------------- | ------------------- |
| `START-1` | Formatting passes dprint with no diffs              | `pnpm format:check` |
| `START-2` | Typechecking succeeds workspace-wide with no errors | `pnpm typecheck`    |
| `START-3` | All test suites pass                                | `pnpm test`         |
| `START-4` | Full CI validation passes before completion         | `pnpm check:ci`     |
| `START-5` | The e2e journeys pass against `pnpm dev`            | `pnpm journeys`     |

Workspace roots: `packages/` holds libraries, `apps/` holds publishable
applications — both are workspace globs in `pnpm-workspace.yaml`. Turbo declares
`dist/**` as each package's build output; `pnpm gate:dist` runs that build.

## CI

- This repo is a template and holds no credentials; CI proves everything locally. Gate: review of the workflow diff; a job that needs a secret carries `if: ${{ !github.event.repository.is_template }}`.
- Every job runs on GitHub-hosted runners: `ubuntu-latest`, plus `ubuntu-24.04-arm` for the aarch64-linux job. This repository is public, and the org's self-hosted fleet runner group admits only private repositories (fork safety), so a `[self-hosted, systemfsoftware-runner, *]` job here queues forever. Gate: review of the workflow diff.
- Cloudflare credentials enter a sandbox only through `bin/cloud` (deploy, destroy, state reads). Gate: review of the workflow diff — wrong: `sandbox --pass-env CLOUDFLARE_API_TOKEN -- pnpm --filter @endgame/site exec alchemy deploy`; right: `./bin/cloud pnpm --filter @endgame/site exec alchemy deploy`.
- CI is five workflows: `check.yml` (one `check` job: `turbo run format:check lint typecheck test --affected` and the change-intent gate on PRs), `commitlint.yml` (calls the shared `reusable-commitlint.yml` from systemfsoftware/systemfsoftware, pinned by commit SHA; it lints the commits of the pull request itself, and `.mergify.yml` requires it as a queue condition on the PR, never as a merge condition on the queue draft, whose generated `Merge of #<n>` commit is not a person's commit; only its success satisfies that condition, except a skip on a Dependabot-authored PR, since the reusable skips Dependabot on purpose and skips everyone else when its `sfs-deps` job fails), `deploy.yml` (a `deploy` and a `cleanup` job, dormant until the repository variable `ALCHEMY_DEPLOY` is `true`), `nix-cache-push.yml` (on a push to main, builds `workspace-tarballs` and every `workspace-tarballs.members` output from `github:<repository>/<sha>`, never the checkout, and pushes them signed to nix.systemfsoftware.com, the package registry for @systemfsoftware packages; nothing goes to npm; the job then requires an HTTP 200 narinfo carrying a `Sig: nix-cache-1:` line for every pushed path; it runs in the `nix-cache-push` environment on x86_64-linux and aarch64-linux GitHub-hosted runners) and `release.yml` (the shared release tooling that versions and tags the four published packages, dispatching `check.yml` on the release PR); mutation is an on-demand package script and never gates a deploy. Gate: review of the workflow diff.

## End of Session

Commit changes using conventional commits (`<type>(<scope>): <subject>`). Ensure the working tree is clean and `pnpm check:ci` passes.
