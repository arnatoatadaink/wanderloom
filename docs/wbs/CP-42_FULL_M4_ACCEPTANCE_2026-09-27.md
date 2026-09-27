# CP-42 — Full M4 Acceptance — 2026-09-27

## Status

**In validation**

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

## Local validation evidence required

Record the final local results below before marking CP-42 Accepted:

```text
pnpm typecheck
<result>

pnpm test
<workspace/test totals>

pnpm build
<result including Wrangler dry-run>

bash scripts/cp42-acceptance.sh
<final PASS/FAIL>
```

## Exit criteria

- migration set 0001–0006 verified: pending local runner
- all workspace typechecks green: pending local runner
- all workspace tests green: pending local runner
- all workspace builds green: pending local runner
- Wrangler dry-run green: pending local runner
- CP-36 through CP-41 behavioral contracts covered by regression suites: pending aggregate run

## Result

CP-42 remains **In validation** until the full local acceptance runner is green.

Once green, M4 **Seamless Persistence UX** can be marked Complete and prepared for the provisional `v0.0.4` release baseline.
