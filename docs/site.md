# The reference site

`apps/site` is a TanStack Start site running on one Cloudflare Worker over one D1 database. The page calls the Worker through `effect/rpc`, using a typed `RpcClient` against one `RpcGroup` served at `/api/rpc`. [Alchemy](https://alchemy.run) defines and deploys the stack. `apps/site-e2e` holds the end-to-end journeys that run against the site.

## Run it locally

Enter the dev shell and install as [CONTRIBUTING.md](../CONTRIBUTING.md#setup) describes:

```bash
pnpm dev       # the whole app at http://localhost:1337, Alchemy's local emulation, no cloud
pnpm journeys  # the end-to-end journeys in a real browser against pnpm dev
```

The `health` procedure probes the database. It answers `ok` when the pure decision `check-health.workflow.ts` finds the probe answered, and refuses with `DatabaseUnreachable` otherwise.

## The guestbook

The site's one example feature is a guestbook at `/guestbook`. A pure decision (`sign-guestbook.workflow.ts`, built with `Workflow.make`) trims a name and a message and refuses them with typed errors. The RPC procedures `sign` and `list` write and read entries in D1, using the decision's tagged refusals as `sign`'s error schema. The page shows the entries or the refusal.

Any visitor can flag or vouch for an entry. A second decision (`moderate-guestbook-entry.workflow.ts`) applies the event to the entry's stored state (`Visible`, `Flagged`, or `Hidden`) using the pure `transition` of a machine from our XState fork, and refuses any event that state cannot take. The `moderate` procedure writes the new state only if the row still holds the state it read. `list` never returns a `Hidden` entry.

Everything the guestbook owns lives in [`apps/site/src/features/guestbook`](../apps/site/src/features/guestbook) and [`apps/site-e2e/tests/features/guestbook`](../apps/site-e2e/tests/features/guestbook).

## Deploy

Deploys go to your own Cloudflare account. Set `CLOUDFLARE_API_TOKEN` (a token that can edit Workers and D1) and `CLOUDFLARE_ACCOUNT_ID`. Optionally set `SITE_DOMAIN` (a hostname in a zone on that account) to serve production on that domain instead of on `workers.dev`:

```bash
pnpm run deploy                         # stage prod
ALCHEMY_STAGE=pr-12 pnpm run deploy     # a preview stage
ALCHEMY_STAGE=pr-12 pnpm run destroy
```

Run `pnpm run deploy` rather than `pnpm deploy`, because the bare form invokes pnpm's built-in command.

Nothing deploys until you set the repository variable `ALCHEMY_DEPLOY` to `true` and add the credentials below. You can also set `SITE_DOMAIN` as a repository variable to serve production on a domain. Once enabled, every same-repo pull request gets a preview deploy with its URL in a comment, and its stage is destroyed when the pull request closes. Pushes to `main` deploy production in one job with no gate in front of it.

## Credentials for CI

The operator runs this bootstrap once per repository that opts in to deploys. It runs on the host, outside every sandbox (not through `bin/cloud` or `sandbox --`). It mints a scoped Cloudflare token and writes it to the repository as secrets, so no one hand-copies a token into repository settings.

The bootstrap requires `SITE_DOMAIN` (a hostname in a zone on the account) because the CI token's zone grants are scoped to that zone. A repository that serves only on `workers.dev` skips the bootstrap and creates the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets by hand instead.

Run the bootstrap from `apps/site` in the dev shell using the operator's own secrets (supplied from Doppler, key named by the operator; never print them):

```bash
cd apps/site
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… GITHUB_ACCESS_TOKEN=… \
  GITHUB_REPOSITORY=<owner>/<repo> SITE_DOMAIN=<hostname> \
  pnpm exec alchemy deploy --config stacks/github.ts --stage ci-credentials
```

- `CLOUDFLARE_API_TOKEN`: an admin-scoped Cloudflare token that can create API tokens. A standard Edit Workers token is not enough; use an account API token with `Account > API Tokens > Write`, or the Global API Key.
- `CLOUDFLARE_ACCOUNT_ID`: the target account.
- `GITHUB_ACCESS_TOKEN`: a fine-grained personal access token on that one repository with only Secrets: write, and a short expiry.
- `GITHUB_REPOSITORY`: `<owner>/<repo>` of the repository that receives the secrets.
- `SITE_DOMAIN`: a hostname in a zone on the account. The CI token's zone grants are limited to that zone.

These environment credentials override any alchemy profile, so no `--profile` flag is needed. Because the stage is fixed to `ci-credentials`, rerunning the command updates the same token and secrets instead of minting new ones. A rerun changes the token's grants in place and keeps its value.

The stack is named `github-<owner>-<repo>` from `GITHUB_REPOSITORY`, so each repository's bootstrap keeps its own state. Alchemy's state store keys each resource by stack, stage, and resource name (`@alchemy.run/cloudflare` `src/StateStore/Api.ts:75-79`, `:121-135`), using the stack name from `Alchemy.Stack` (`alchemy/src/Stack.ts:155-157`, `:216`). Two repositories never share a state key, and one repository's `destroy` cannot delete another's token or secrets.

The stack creates a Cloudflare account API token and two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token holds:

- Account: Workers Scripts Write, D1 Write, Workers Tail Read, and Secrets Store Write. Secrets Store Write is needed because every cloud stage keeps its state in a worker that is bound to the account's Secrets Store.
- The `SITE_DOMAIN` zone only: Workers Routes Write, DNS Write, and Zone Read. Zone Read is needed because the custom-domain path looks the zone up by name.

After the bootstrap runs:

1. Confirm the secrets exist with `gh secret list` (names only).
2. Revoke the previous hand-made Cloudflare token by name in the Cloudflare dashboard.
3. Set the repository variable `ALCHEMY_DEPLOY` to `true`, and set `SITE_DOMAIN` to the same hostname so production serves on it.
4. Rotate the token's value at least every 90 days. Run `pnpm exec alchemy destroy --config stacks/github.ts --stage ci-credentials` with the same environment, then run the deploy command again. The destroy deletes the token, the deploy mints a new one and rewrites both secrets, and deploys fail in between.

A new resource type needs its permission group added to `apps/site/stacks/github.ts`.

## Branch protection

[`.github/rulesets/gates.json`](../.github/rulesets/gates.json) defines the "gates" ruleset, which requires the single `check` job. Install it once with your own GitHub credentials:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/gates.json
```

When the required checks change, update the existing ruleset instead of creating a second one. Look up its id with `gh api repos/{owner}/{repo}/rulesets`, then overwrite it with `gh api repos/{owner}/{repo}/rulesets/<id> -X PUT --input .github/rulesets/gates.json`. Run `pnpm check:branch-rules` to confirm that the live ruleset matches [`scripts/check-branch-rules.ts`](../scripts/check-branch-rules.ts). Until you apply the update, a pull request whose checks were renamed hangs on the old contexts.
