# The reference site

`apps/site` is one Cloudflare Worker: a TanStack Start site that calls its Worker through `effect/rpc` (one `RpcGroup` served at `/api/rpc`, a typed `RpcClient` in the page) over one D1 database, defined and deployed with [Alchemy](https://alchemy.run). `apps/site-e2e` holds the end-to-end journeys that run against it.

## Run it locally

Enter the dev shell and install as [CONTRIBUTING.md](../CONTRIBUTING.md#setup) describes, then:

```bash
pnpm dev       # the whole app at http://localhost:1337, Alchemy's local emulation, no cloud
pnpm journeys  # the end-to-end journeys in a real browser against pnpm dev
```

The `health` procedure probes the database and answers `ok` only when the pure decision `check-health.workflow.ts` finds the probe answered, refusing with `DatabaseUnreachable` otherwise.

## The guestbook

The site's one example feature is a guestbook at `/guestbook`. A pure decision (`sign-guestbook.workflow.ts`, built with `Workflow.make`) trims a name and a message and refuses them with typed errors. The RPC procedures `sign` and `list` write and read entries in D1, with the decision's tagged refusals as `sign`'s error schema, and the page shows the entries or the refusal.

Any visitor can flag or vouch for an entry. A second decision (`moderate-guestbook-entry.workflow.ts`) applies the event to the entry's stored state (`Visible`, `Flagged` or `Hidden`) with the pure `transition` of a machine from our XState fork, and refuses an event the state can't take. The `moderate` procedure writes the new state only if the row still holds the state it read, and `list` never returns a `Hidden` entry.

Everything it owns lives in [`apps/site/src/features/guestbook`](../apps/site/src/features/guestbook) and [`apps/site-e2e/tests/features/guestbook`](../apps/site-e2e/tests/features/guestbook).

## Deploy

Deploys go to your own Cloudflare account. Set `CLOUDFLARE_API_TOKEN` (a token that can edit Workers and D1) and `CLOUDFLARE_ACCOUNT_ID`, and optionally `SITE_DOMAIN` (a hostname in a zone on that account) to serve production there instead of on `workers.dev`:

```bash
pnpm run deploy                         # stage prod
ALCHEMY_STAGE=pr-12 pnpm run deploy     # a preview stage
ALCHEMY_STAGE=pr-12 pnpm run destroy
```

`pnpm run deploy`, not `pnpm deploy`: the bare form is pnpm's own built-in command.

Once the repository variable `ALCHEMY_DEPLOY` is `true` (plus `SITE_DOMAIN` as a repository variable to serve production on a domain) and the credentials below exist, every same-repo pull request gets a preview deploy with its URL in a comment and its stage destroyed on close, and `main` deploys production in one job with no gate in front of it. Nothing deploys until `ALCHEMY_DEPLOY` is set.

## Credentials for CI

The operator runs this once per repository that opts in to deploys. It runs on the host, outside every sandbox (not through `bin/cloud` or `sandbox --`). It mints a scoped Cloudflare token and writes it to the repository as secrets, so no one hand-copies a token into repository settings.

The bootstrap requires `SITE_DOMAIN`: a hostname in a zone on the account, because the CI token's zone grants are scoped to that zone. A repository that serves only on `workers.dev` skips the bootstrap and creates the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets by hand instead.

From `apps/site` in the dev shell, with the operator's own secrets (supplied from Doppler, key named by the operator; never print them):

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

These environment credentials win over any alchemy profile, so no `--profile` flag is needed. The fixed `ci-credentials` stage means a rerun updates the same token and secrets instead of minting new ones. A rerun changes the token's grants in place and keeps its value.

The stack is named `github-<owner>-<repo>` from `GITHUB_REPOSITORY`, so every repository's bootstrap carries its own state: alchemy's state store keys each resource by stack, stage, and resource name (`@alchemy.run/cloudflare` `src/StateStore/Api.ts:75-79`, `:121-135`; the stack name flows from `Alchemy.Stack` into that key, `alchemy/src/Stack.ts:155-157`, `:216`). Two repositories therefore never share a state key, and one repository's `destroy` cannot delete another's token or secrets.

The stack creates a Cloudflare account API token and two repository secrets, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token holds:

- Account: Workers Scripts Write, D1 Write, Workers Tail Read, and Secrets Store Write. Secrets Store Write is needed because every cloud stage keeps its state in a worker that is bound to the account's Secrets Store.
- The `SITE_DOMAIN` zone only: Workers Routes Write, DNS Write, and Zone Read. Zone Read is needed because the custom-domain path looks the zone up by name.

After it runs:

1. Confirm the secrets exist with `gh secret list` (names only).
2. Revoke the previous hand-made Cloudflare token by name in the Cloudflare dashboard.
3. Set the repository variable `ALCHEMY_DEPLOY` to `true`, and `SITE_DOMAIN` to the same hostname so production serves on it.
4. To rotate the token's value, at least every 90 days, run `pnpm exec alchemy destroy --config stacks/github.ts --stage ci-credentials` with the same environment, then run the deploy command again. The destroy deletes the token, the deploy mints a new one and rewrites both secrets, and deploys fail in between.

A new resource type needs its permission group added to `apps/site/stacks/github.ts`.

## Branch protection

[`.github/rulesets/gates.json`](../.github/rulesets/gates.json) is the "gates" ruleset; it requires the single `check` job. Install it once, with your own GitHub credentials:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/gates.json
```

When the checks a ruleset requires change, update the installed ruleset instead of creating a second one: PUT the file to the ruleset's id (`gh api repos/{owner}/{repo}/rulesets/<id> -X PUT --input .github/rulesets/gates.json`, id from `gh api repos/{owner}/{repo}/rulesets`), then run `pnpm check:branch-rules` to confirm the live ruleset and [`scripts/check-branch-rules.ts`](../scripts/check-branch-rules.ts) agree. A pull request whose checks were renamed hangs on the old contexts until it is applied.
