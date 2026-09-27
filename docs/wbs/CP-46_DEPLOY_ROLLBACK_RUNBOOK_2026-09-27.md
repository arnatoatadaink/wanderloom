# CP-46 — Deploy & Rollback Runbook — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Define a reproducible staging-first release sequence for the Wanderloom Worker, record exact source identity at deployment time, and define rollback boundaries for Worker code, Web assets, and D1 schema/data.

## Preconditions

- CP-43 deployment environment model Accepted.
- CP-44 remote D1 migration safety Accepted.
- CP-45 secret/configuration provisioning Accepted.
- commands are run from the repository root unless explicitly noted.
- generated remote Wrangler config exists locally under `workers/api/.wrangler/remote/` and contains real, distinct D1 IDs.
- required Worker secrets have been provisioned for the target environment.
- dummy UUIDs used in local tests must never be used for a real deploy.

## Release identity record

Before staging or production deployment, record the exact source revision:

```bash
git rev-parse HEAD
git describe --tags --exact-match HEAD 2>/dev/null || true
git status --short
```

Acceptance rule:

- commit SHA must be the full 40-character SHA,
- tag may be absent for an unreleased M5 branch,
- working tree must be clean,
- the same tested commit must be promoted from staging to production; do not rebuild production from a different source revision without restarting staging acceptance.

## Staging-first sequence

### 1. Regression gate

```bash
pnpm --filter @wanderloom/api typecheck
pnpm --filter @wanderloom/api test
pnpm --filter @wanderloom/api build
pnpm --filter @wanderloom/web typecheck
pnpm --filter @wanderloom/web test
pnpm --filter @wanderloom/web build
```

### 2. Verify staging configuration

Use CP-45 secret/config verification. Do not print secret values.

```bash
pnpm --filter @wanderloom/api exec wrangler secret list \
  --format json \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

Expected names:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ARCHIVE_TOKEN_ENCRYPTION_KEY`

### 3. Inspect pending D1 migrations

```bash
pnpm --filter @wanderloom/api migrate:remote -- --target staging
```

If pending migrations exist, review them before apply. Applying them remains governed by CP-44 and its exact target-specific confirmation phrase.

### 4. Deploy staging Worker

```bash
pnpm --filter @wanderloom/api exec wrangler deploy \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

`wrangler deploy` creates a new Worker version and immediately deploys it to 100% of traffic for that environment.

### 5. Record staging deployment

```bash
pnpm --filter @wanderloom/api exec wrangler deployments list \
  --json \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

Record:

- source commit SHA,
- optional source tag,
- Worker version/deployment ID returned by Cloudflare,
- deployment timestamp,
- migration state,
- smoke/health result from CP-47 once implemented.

Production promotion is blocked until staging deployment and smoke verification are Accepted.

## Production sequence

Production uses the same source commit that passed staging.

1. Confirm `git rev-parse HEAD` matches the staging source SHA.
2. Confirm clean working tree.
3. Verify production secret names only.
4. Inspect production pending migrations.
5. Apply explicitly approved migrations under CP-44, if any.
6. Deploy production Worker.
7. Record production deployment/version ID.
8. Execute CP-47 production health/smoke verification.

Worker deployment command:

```bash
pnpm --filter @wanderloom/api exec wrangler deploy \
  --env production \
  --config .wrangler/remote/wrangler.remote.json
```

Deployment record:

```bash
pnpm --filter @wanderloom/api exec wrangler deployments list \
  --json \
  --env production \
  --config .wrangler/remote/wrangler.remote.json
```

## Worker rollback

Worker rollback and D1 rollback are separate operations.

Before rollback, inspect recent deployments and select an explicit known-good version ID:

```bash
pnpm --filter @wanderloom/api exec wrangler deployments list \
  --json \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

Rollback staging:

```bash
pnpm --filter @wanderloom/api exec wrangler rollback <VERSION_ID> \
  --message "rollback staging to <VERSION_ID>" \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

For production, replace `staging` with `production` and use a production version ID.

Do not use rollback without a version ID in the operational runbook. Wrangler can infer a previous version interactively, but M5 requires selecting and recording the exact target version.

After rollback:

1. record the new active deployment,
2. run CP-47 smoke checks,
3. inspect D1 compatibility separately,
4. do not assume database state changed with Worker rollback.

Cloudflare Worker rollback activates the selected Worker version but does not change connected D1/KV/R2 resources. Older application code can therefore be incompatible with a schema changed by a later migration.

## D1 rollback / recovery boundary

D1 migrations are not reversed by Worker rollback.

Rules:

- prefer forward-compatible/additive schema migrations,
- do not encode automatic down-migrations into ordinary Worker deploy/rollback,
- if a schema/data change must be reverted, treat it as a database recovery operation,
- inspect D1 Time Travel before destructive recovery,
- recovery must be approved separately from Worker rollback.

Cloudflare D1 Time Travel is always enabled for supported D1 databases and can restore a database to a point within its retention window. A restore overwrites database state and cancels in-flight queries, so it is an emergency/recovery action rather than a routine release step.

CP-46 documents this boundary; it does not perform a real Time Travel restore.

## Web deploy / rollback boundary

The current repository has a Vite Web build but no committed remote Web hosting/deploy configuration. CP-46 therefore does not invent a Cloudflare Pages or other provider workflow.

Current Web release rule:

- `pnpm --filter @wanderloom/web build` produces the tested build artifact,
- the Web deployment platform must record the same source commit/tag used for the artifact,
- rollback means rebuild/redeploy the last known-good source commit/tag through the chosen hosting platform,
- provider-specific Web rollback commands must be added when that hosting target is selected.

Until a Web host is formally configured, CP-46 cannot claim that Web remote rollback has been exercised.

## Deployment stop conditions

Stop promotion/deployment if any of the following is true:

- dirty working tree,
- source SHA differs from tested/staging SHA,
- missing required secret names,
- generated config uses dummy or unknown D1 IDs,
- staging and production D1 IDs match,
- pending migration set is not reviewed,
- staging smoke test fails,
- rollback target version ID is unknown,
- Worker rollback would target code incompatible with current D1 schema.

## Code-level contract

`workers/api/src/deployment-runbook.ts` defines:

- explicit staging/production deploy commands,
- explicit deployment-list commands,
- rollback requiring a non-empty version ID,
- full 40-character source SHA validation.

Tests are in `workers/api/src/deployment-runbook.test.ts`.

## Acceptance evidence — 2026-09-27

- API typecheck: PASS
- API tests: **29 files / 92 tests PASS**
- API local Wrangler build/dry-run: PASS
- Web typecheck: PASS
- Web tests: **14 files / 48 tests PASS**
- Web Vite production build: PASS
- validated source revision: `d4a11f7e18e86a74c8ac528b69ebae589d2c49fe`
- `git status --short`: clean
- deployment command-contract tests: PASS
- staging-first and production promotion sequences: documented
- Worker rollback requires explicit version ID: documented/tested
- Worker rollback and D1 recovery separation: documented
- D1 Time Travel recovery boundary: documented
- Web remote hosting/rollback remains explicitly unresolved until a hosting platform is selected
- no real remote deploy, Worker rollback, production migration, or D1 recovery was performed for CP-46 acceptance

## Acceptance conclusion

CP-46 is **Accepted / Complete**. The repository now has a deterministic deploy/rollback contract suitable for CP-47 post-deploy health/smoke implementation. Remote execution remains intentionally deferred until real staging resources and an explicit deployment decision exist.
