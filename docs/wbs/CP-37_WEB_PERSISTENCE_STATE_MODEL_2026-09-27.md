# CP-37 Web Persistence State Model — 2026-09-27

## Status

**Implementation baseline — persistence state model added, app/API wiring pending**

## Position

```text
v0.0.3 / M3 baseline ✅
M4 Seamless Persistence UX
  |
  +-> CP-36 Drive Connection Status Contract ✅
  +-> CP-37 Web Persistence State Model 🚧
  +-> CP-38 Existing Authorization Reuse
  +-> CP-39 Reauthorization Classification
  +-> CP-40 Nonblocking Drive Recovery UX
  +-> CP-41 Best-Effort Archive Sync Trigger
  +-> CP-42 Full M4 Acceptance
```

## Objective

Separate Google account / Drive archive presentation state from gameplay phase, gameplay busy state and global gameplay error state.

CP-37 must prevent identity/archive state transitions from reusing generic gameplay flags such as `busy` and `errorMessage`.

## Initial implementation

Added:

- `apps/web/src/persistence-state.ts`
- `apps/web/src/persistence-state.test.ts`

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

Safe Drive metadata held by the Web state:

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

## Current tests

The initial tests verify:

- persistence state starts independently from gameplay state
- CP-36 connected metadata can be applied deterministically
- transient Drive failure changes only persistence state
- persistence state does not acquire gameplay `busy`, `phase` or `errorMessage` fields

## Remaining CP-37 work

1. add API-client DTO/method for `GET /api/archive/google/status`
2. integrate `PersistenceViewState` into `WanderloomApp`
3. load Drive status after guest/restore state initialization when a player id exists
4. represent Google-link/restore status through the persistence model rather than ad-hoc booleans/messages where practical
5. render explicit account/archive status without blocking gameplay
6. expand Web tests for restore/rerender/local Drive failures
7. run Web/workspace typecheck and tests
8. accept and merge CP-37 to `m4`

## Scope boundary

Not in CP-37:

- automatically skipping Drive authorization popup -> CP-38
- OAuth invalid-grant/revocation classification -> CP-39
- reconnect workflow semantics -> CP-40
- claim-triggered archive synchronization -> CP-41
