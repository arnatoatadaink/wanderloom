# CP-38 Existing Authorization Reuse — 2026-09-27

## Status

**Accepted / Complete**

## Position

```text
v0.0.3 / M3 baseline ✅
M4 Seamless Persistence UX
  |
  +-> CP-36 Drive Connection Status Contract ✅
  +-> CP-37 Web Persistence State Model ✅
  +-> CP-38 Existing Authorization Reuse ✅
  +-> CP-39 Reauthorization Classification
  +-> CP-40 Nonblocking Drive Recovery UX
  +-> CP-41 Best-Effort Archive Sync Trigger
  +-> CP-42 Full M4 Acceptance
```

## Objective

Reuse an already-established Google Drive authorization without reopening the Google OAuth popup for every archive synchronization.

## Accepted behavior

When the Web persistence state reports:

```text
driveArchive = connected
```

archive synchronization follows:

```text
reuse existing authorization
  -> do not call requestDriveAuthorization()
  -> do not call /api/archive/google/authorize
  -> call syncArchive() directly
```

When Drive is not currently connected, synchronization follows the existing authorization path:

```text
request authorization
  -> requestDriveAuthorization()
  -> /api/archive/google/authorize
  -> refresh persistence status
  -> syncArchive()
```

## Implementation

Added:

- `apps/web/src/archive-authorization-reuse.ts`
- `apps/web/src/archive-authorization-reuse.test.ts`
- `apps/web/src/archive-sync-flow.ts`
- `apps/web/src/archive-sync-flow.test.ts`

Updated:

- `apps/web/src/app.ts`

The application now delegates authorization reuse to `runArchiveSyncFlow()` rather than always requesting Drive authorization.

## UI behavior

For an already-connected Drive archive, the action reports:

```text
Syncing Drive archive…
```

instead of incorrectly claiming that a new Google Drive permission request is being made.

## Validation

User validation on 2026-09-27:

```text
@wanderloom/web typecheck: PASS
Test Files: 12 passed
Tests: 35 passed
```

Coverage includes:

- connected Drive chooses existing authorization reuse
- non-connected Drive requests authorization
- connected reuse path does not call the OAuth popup
- connected reuse path does not call the authorization endpoint
- authorization path refreshes persistence status before sync
- existing Web regression tests remain green

## Scope boundary

Not in CP-38:

- classifying revoked / invalid Google refresh authorization -> CP-39
- user-facing reconnect recovery workflow -> CP-40
- best-effort archive sync triggered by claim -> CP-41
