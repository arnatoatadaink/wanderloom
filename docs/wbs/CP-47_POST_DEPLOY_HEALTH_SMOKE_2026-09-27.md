# CP-47 — Post-Deploy Health / Smoke Verification — 2026-09-27

## Status

**In progress — deterministic smoke contract implemented**

## Objective

Define deterministic post-deploy verification for staging and production, covering health, guest bootstrap, playable-loop smoke, migration state, and safe identity/archive checks without leaking credentials.

## Entry criteria

- CP-43 through CP-46 Accepted.
- commands are run from the Wanderloom repository root.
- a target Worker URL is known and uses HTTPS for remote environments.
- staging/production smoke evidence is kept separate.

## Release-blocking smoke sequence

The canonical code-level contract is `workers/api/src/post-deploy-smoke.ts`.

Every release target requires these results:

1. `health`
2. `guest_bootstrap`
3. `state`
4. `inventory`
5. `zones`
6. `exploration_start`
7. `exploration_claim`
8. `migration_state`

Missing evidence fails closed. A failed result also blocks promotion/release completion.

## Phase A — immediate HTTP gate

Use a dedicated smoke guest rather than an existing player account.

### 1. Health

```bash
curl --fail-with-body --silent --show-error \
  "$WANDERLOOM_SMOKE_BASE_URL/api/health"
```

Expected response contains:

```json
{"ok":true}
```

### 2. Guest bootstrap

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  "$WANDERLOOM_SMOKE_BASE_URL/api/guest/bootstrap"
```

Record only the generated `playerId` needed for the remainder of the smoke. Do not reuse a real user account.

### 3. State

With the smoke `playerId` in `WANDERLOOM_SMOKE_PLAYER_ID`:

```bash
curl --fail-with-body --silent --show-error \
  -H "x-wanderloom-player-id: $WANDERLOOM_SMOKE_PLAYER_ID" \
  "$WANDERLOOM_SMOKE_BASE_URL/api/state"
```

Expected: `ok=true` and a valid core snapshot.

### 4. Inventory

```bash
curl --fail-with-body --silent --show-error \
  -H "x-wanderloom-player-id: $WANDERLOOM_SMOKE_PLAYER_ID" \
  "$WANDERLOOM_SMOKE_BASE_URL/api/inventory"
```

Expected: `ok=true` and a valid inventory snapshot.

### 5. Zones

```bash
curl --fail-with-body --silent --show-error \
  -H "x-wanderloom-player-id: $WANDERLOOM_SMOKE_PLAYER_ID" \
  "$WANDERLOOM_SMOKE_BASE_URL/api/zones"
```

Expected: `ok=true` and the configured smoke zones.

### 6. Start exploration

Use the current production-compatible smoke zone and shortest supported duration:

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  -H "content-type: application/json" \
  -H "x-wanderloom-player-id: $WANDERLOOM_SMOKE_PLAYER_ID" \
  --data '{"zoneId":"m1-smoke-frontier","durationId":"short"}' \
  "$WANDERLOOM_SMOKE_BASE_URL/api/explorations"
```

Record the returned exploration ID.

## Phase B — delayed claim gate

The production `short` exploration duration is currently **300 seconds**. Therefore claim cannot be truthfully verified immediately after start.

After the exploration is claimable, execute:

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  -H "x-wanderloom-player-id: $WANDERLOOM_SMOKE_PLAYER_ID" \
  "$WANDERLOOM_SMOKE_BASE_URL/api/explorations/$WANDERLOOM_SMOKE_EXPLORATION_ID/claim"
```

Expected:

- `ok=true`,
- claim resolves once,
- resulting core/inventory state remains readable,
- the same smoke guest can continue the playable loop.

Do not weaken this gate by claiming immediately and accepting an expected `not_ready`/early-claim failure as a successful post-deploy claim check.

## Phase C — D1 migration state

Migration state is verified independently of HTTP health:

Staging:

```bash
pnpm --filter @wanderloom/api migrate:remote -- --target staging
```

Production:

```bash
pnpm --filter @wanderloom/api migrate:remote -- --target production
```

This is a list/preview operation unless CP-44 explicit apply confirmation is separately supplied.

Acceptance requires that the intended migration set has been applied for the deployed code and that no unexpected pending migration is ignored.

## Google identity / Drive checks

Google/Drive verification is intentionally separated from the anonymous core smoke.

Safe default:

- verify required secret **names/presence** through CP-45,
- do not place Google ID tokens, authorization codes, refresh tokens, access tokens, or client secrets in smoke logs,
- do not create or modify a real user's Google/Drive linkage merely to satisfy routine smoke acceptance.

When a dedicated staging test identity and authorization already exist, additional checks may include:

- linked identity restore,
- `/api/archive/google/status`,
- best-effort archive sync.

Those checks are supplementary for CP-47 unless a dedicated safe credential fixture exists. Core release acceptance must never depend on pasting live provider credentials into reports.

## Target URL safety

`requireAbsoluteBaseUrl()` enforces:

- remote URLs use HTTPS,
- localhost/127.0.0.1 may use HTTP for local verification,
- no username/password credentials in the URL,
- no query string or fragment in the configured base URL.

## Failure policy

Promotion/release completion is blocked if any required smoke result is missing or failed.

Examples:

- `/api/health` unavailable → block,
- bootstrap or state failure → block,
- exploration start failure → block,
- claim not successfully completed after the configured duration → block,
- migration state unknown or inconsistent → block.

A Worker rollback under CP-46 must be followed by this same CP-47 smoke sequence against the rollback target.

## Evidence rules

Release evidence may contain:

- environment name,
- source commit/tag,
- target base URL hostname,
- HTTP status/result category,
- smoke guest/exploration IDs if operationally useful,
- migration filenames/state,
- timestamps.

Release evidence must not contain:

- Google client secret,
- archive encryption key,
- OAuth authorization code,
- ID/access/refresh token,
- real user private archive payloads.

## Local contract tests

`workers/api/src/post-deploy-smoke.test.ts` verifies:

- exact required smoke step set,
- every required step is release-blocking,
- claim is explicitly delayed,
- missing/failed evidence fails closed,
- migration checks are target-specific,
- unsafe remote base URLs are rejected.

## Acceptance evidence required

Before CP-47 can be Accepted:

1. API typecheck PASS,
2. all API tests PASS,
3. API local Wrangler build/dry-run PASS,
4. post-deploy smoke contract tests PASS,
5. immediate/delayed/operator phases documented,
6. claim duration constraint explicitly preserved,
7. migration-state verification documented for both environments,
8. Google/Drive credential handling is non-secret and non-destructive by default,
9. smoke failure blocks promotion/release completion,
10. no real remote deployment is required merely to accept the contract; live staging execution becomes deployment evidence when a real staging Worker is intentionally provisioned.
