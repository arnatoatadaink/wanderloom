# CP-36 Drive Connection Status Contract — 2026-09-27

## Status

**Accepted / Complete**

## Position

```text
v0.0.3 / M3 baseline ✅
M4 Seamless Persistence UX ✅ planning accepted
  |
  +-> CP-36 Drive Connection Status Contract ✅
  +-> CP-37 Web Persistence State Model
  +-> CP-38 Existing Authorization Reuse
  +-> CP-39 Reauthorization Classification
  +-> CP-40 Nonblocking Drive Recovery UX
  +-> CP-41 Best-Effort Archive Sync Trigger
  +-> CP-42 Full M4 Acceptance
```

## Objective

Expose server-authoritative Google Drive archive connection state without returning credential material.

Endpoint:

`GET /api/archive/google/status`

## Contract

State enum:

```text
not_connected
connected
reauthorization_required
```

CP-36 actively resolves:

- `not_connected`
- `connected`

`reauthorization_required` is reserved in the contract now but its transition/classification logic is intentionally implemented in CP-39.

Safe metadata:

- granted scope
- authorized timestamp
- updated timestamp

Forbidden response material:

- raw refresh token
- encrypted refresh-token ciphertext
- refresh-token IV
- access token
- Google client secret
- archive encryption key

## Implementation

Added:

- `workers/api/src/services/get-google-drive-connection-status.ts`
- `workers/api/src/services/get-google-drive-connection-status.test.ts`
- `workers/api/src/cp36-drive-connection-status.integration.test.ts`
- `GET /api/archive/google/status` wiring in `workers/api/src/api.ts`

Behavior:

```text
no google_drive_authorizations row
  -> not_connected

stored encrypted authorization row
  -> connected
     + safe scope/timestamp metadata only
```

The service deliberately treats the D1 authorization record as the CP-36 server-authoritative persisted state. It does not perform a live token refresh probe because doing so would couple a simple status read to Google availability and would blur CP-36 with CP-39.

## Acceptance evidence

Local validation on 2026-09-27:

```text
@wanderloom/api typecheck: PASS
Worker Test Files: 22 passed
Worker Tests:      64 passed
```

The CP-36 integration coverage verifies:

- missing player id -> stable `missing_player_id` CP-29 error contract
- no authorization -> `not_connected`
- stored authorization -> `connected`
- response does not expose refresh-token ciphertext, IV, refresh/access token fields
- existing Worker M2/M3 identity/archive/concurrency regressions remain green in the same 64-test run

During acceptance, an `exactOptionalPropertyTypes` test-helper typing issue was found in `RequestInit`. It was corrected by omitting the optional `headers` property entirely when no player id is supplied. Runtime tests were already green before this fix; final typecheck and tests both pass afterward.

## Exit criteria

- provider state can be queried safely for the current player ✅
- connected/not-connected paths are covered by automated tests ✅
- no credential material is returned ✅
- endpoint uses the existing `x-wanderloom-player-id` ownership boundary ✅
- API errors retain the CP-29 stable contract ✅
- existing M3 Google/Drive/archive regressions remain green ✅
- Worker typecheck/test green ✅

No schema migration is required for CP-36.

## Scope boundary

Not in CP-36:

- browser UI state rendering -> CP-37
- bypassing consent popup and direct sync reuse -> CP-38
- `invalid_grant` / revocation classification -> CP-39
- reconnect UX -> CP-40
- automatic claim-triggered sync -> CP-41

## Next action

Merge CP-36 into `m4` and begin CP-37 — Web Persistence State Model.
