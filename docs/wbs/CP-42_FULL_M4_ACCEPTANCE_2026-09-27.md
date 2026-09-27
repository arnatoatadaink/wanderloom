# CP-42 — Full M4 Acceptance — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Validate M4 Seamless Persistence UX as an integrated milestone after CP-36 through CP-41.

M4 acceptance is about preserving gameplay authority and continuity while Google Drive remains optional, recoverable, and nonblocking.

## M4 critical path covered

- CP-36 — Drive Connection Status Contract
- CP-37 — Web Persistence State Model
- CP-38 — Existing Authorization Reuse
- CP-39 — Reauthorization Classification
- CP-40 — Nonblocking Drive Recovery UX
- CP-41 — Best-Effort Archive Sync Trigger
- CP-42 — Full M4 Acceptance

## Automated acceptance runner

Run from repository root:

```bash
bash scripts/cp42-acceptance.sh
```

The runner verifies:

1. migration set is exactly `0001` through `0006`,
2. all workspace typechecks pass,
3. all workspace tests pass,
4. all workspace builds pass,
5. Worker build executes Wrangler deploy dry-run.

Equivalent commands are:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## M4 behavioral acceptance matrix

### Drive connection state

- no stored Drive authorization → `not_connected`
- usable stored authorization → `connected`
- persisted credential invalidation → `reauthorization_required`
- temporary status-load failure remains local in the web persistence model

### Existing authorization reuse

- `connected` Drive state does not open a Google OAuth popup for manual sync
- transient Drive failure retry does not force new consent
- `not_connected` requires explicit user authorization
- `reauthorization_required` requires explicit reconnect action

### Reauthorization classification

- Google OAuth `invalid_grant` persists reconnect-required state
- HTTP 408 / 429 / 5xx and network-style transient failures do not mutate authorization into reconnect-required
- successful reauthorization clears the persisted reconnect marker
- public Drive status never exposes refresh-token material or internal stored reason

### Nonblocking recovery UX

- reconnect and retry actions are explicit
- popup cancellation remains local to Drive recovery
- Drive recovery failure does not transition gameplay into global error state
- Drive busy state is separate from gameplay busy state
- returning players can operate Drive recovery based on persisted Drive state

### Claim-triggered best-effort archive sync

- successful claim remains authoritative before Drive work begins
- result state is not rolled back by Drive failure
- connected Drive state may trigger background sync
- temporarily unavailable Drive state may trigger best-effort retry
- `not_connected`, `reauthorization_required`, and `unknown` never trigger automatic OAuth consent
- manual sync/reconnect remains available as the recovery path

## Final local validation evidence

Executed on 2026-09-27 with:

```bash
bash scripts/cp42-acceptance.sh
```

Observed results:

```text
[CP-42] migrations 0001-0006: PASS

workspace typecheck: PASS
- apps/web: PASS
- packages/game-core: PASS
- workers/api: PASS

workspace tests: PASS
- packages/game-core: 19 files / 65 tests
- apps/web: 14 files / 48 tests
- workers/api: 24 files / 76 tests
- aggregate: 57 files / 189 tests

workspace build: PASS
- apps/web: Vite production build PASS
- packages/game-core: TypeScript build PASS
- workers/api: Wrangler deploy --dry-run PASS

Wrangler 4.132.0 dry-run:
- Worker bundle generated
- D1 binding wanderloom-local resolved
- dry-run exited successfully

[CP-42] full automated acceptance: PASS
```

## Exit criteria

- migration set 0001–0006 verified: **PASS**
- all workspace typechecks green: **PASS**
- all workspace tests green: **PASS — 189 tests**
- all workspace builds green: **PASS**
- Wrangler dry-run green: **PASS**
- CP-36 through CP-41 behavioral contracts covered by regression suites: **PASS**

## Result

CP-42 is **Accepted / Complete**.

M4 **Seamless Persistence UX** is therefore **Complete**. The repository is ready for the provisional `v0.0.4` release baseline preparation and final release integration steps.
