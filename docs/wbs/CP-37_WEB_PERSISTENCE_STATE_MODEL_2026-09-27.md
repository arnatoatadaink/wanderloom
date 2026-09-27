# CP-37 Web Persistence State Model — 2026-09-27

## Status

**Accepted / Complete**

## Position

```text
v0.0.3 / M3 baseline ✅
M4 Seamless Persistence UX
  |
  +-> CP-36 Drive Connection Status Contract ✅
  +-> CP-37 Web Persistence State Model ✅
  +-> CP-38 Existing Authorization Reuse
  +-> CP-39 Reauthorization Classification
  +-> CP-40 Nonblocking Drive Recovery UX
  +-> CP-41 Best-Effort Archive Sync Trigger
  +-> CP-42 Full M4 Acceptance
```

## Objective

Separate Google account / Drive archive presentation state from gameplay phase, gameplay busy state and global gameplay error state.

CP-37 prevents identity/archive state transitions from reusing generic gameplay flags such as `busy` and `errorMessage`.

## Implemented

Added:

- `apps/web/src/persistence-state.ts`
- `apps/web/src/persistence-state.test.ts`
- `apps/web/src/persistence-state-loader.ts`
- `apps/web/src/persistence-state-loader.test.ts`
- `apps/web/src/persistence-controller.ts`
- `apps/web/src/persistence-controller.test.ts`
- `apps/web/src/persistence-coordinator.ts`
- `apps/web/src/persistence-coordinator.test.ts`
- `apps/web/src/persistence-status-view.ts`
- `apps/web/src/persistence-status-view.test.ts`
- `apps/web/src/cp37-persistence-api-client.test.ts`

Updated:

- `apps/web/src/api-client.ts`
- `apps/web/src/app.ts`

State domains:

```text
Google account:
  unknown
  guest
  connected

Drive archive:
  unknown
  not_connected
  connected
  reauthorization_required
  temporarily_unavailable
```

Safe Drive metadata held by Web state:

- granted scope
- authorized timestamp
- updated timestamp
- local Drive status message

Explicitly absent from this state:

- gameplay `phase`
- gameplay `busy`
- gameplay `errorMessage`
- OAuth access token
- refresh token / encrypted token material

## Accepted behavior

- Web API client reads `GET /api/archive/google/status` using the current player identity.
- Guest, stored-player, Google link, Google restore and Drive authorization lifecycle events converge through the persistence coordinator.
- Drive status failures are mapped to `temporarily_unavailable` without changing gameplay phase or global gameplay error state.
- Gameplay state renders before the best-effort Drive status refresh, so Drive latency or failure does not block the playable loop.
- Ready UI exposes explicit Google-account and Drive-archive status labels.
- Google link/restore and Drive authorization refresh persistence state after success.

## Validation evidence

Local WSL validation supplied on 2026-09-27:

```text
@wanderloom/web typecheck: PASS
Test Files: 10 passed (10)
Tests:      28 passed (28)
```

Covered behaviors include:

- persistence state independence from gameplay state
- safe Drive status DTO/client mapping
- connected/not-connected/transient failure state application
- Google connection retained while Drive is temporarily unavailable
- persistence lifecycle coordination
- explicit account/archive presentation labels
- existing Web regressions remain green

## Acceptance decision

CP-37 is **Accepted / Complete**.

The Web persistence-state boundary is now stable enough for CP-38 to reuse existing Drive authorization without forcing a new OAuth popup when the server already has a usable authorization record.

## Scope boundary

Not in CP-37:

- automatically skipping Drive authorization popup -> CP-38
- OAuth invalid-grant/revocation classification -> CP-39
- reconnect workflow semantics -> CP-40
- claim-triggered archive synchronization -> CP-41
