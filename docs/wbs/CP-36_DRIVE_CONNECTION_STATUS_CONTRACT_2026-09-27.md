# CP-36 Drive Connection Status Contract — 2026-09-27

## Status

**Implementation baseline — contract/service ready, API wiring pending**

## Position

```text
v0.0.3 / M3 baseline ✅
M4 Seamless Persistence UX ✅ planning accepted
  |
  +-> CP-36 Drive Connection Status Contract 🚧
  +-> CP-37 Web Persistence State Model
  +-> CP-38 Existing Authorization Reuse
  +-> CP-39 Reauthorization Classification
  +-> CP-40 Nonblocking Drive Recovery UX
  +-> CP-41 Best-Effort Archive Sync Trigger
  +-> CP-42 Full M4 Acceptance
```

## Objective

Expose server-authoritative Google Drive archive connection state without returning credential material.

Target endpoint:

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

## Implementation baseline

Added:

- `workers/api/src/services/get-google-drive-connection-status.ts`
- `workers/api/src/services/get-google-drive-connection-status.test.ts`

Behavior:

```text
no google_drive_authorizations row
  -> not_connected

stored encrypted authorization row
  -> connected
     + safe scope/timestamp metadata only
```

The service deliberately treats the D1 authorization record as the CP-36 server-authoritative persisted state. It does not perform a live token refresh probe because doing so would couple a simple status read to Google availability and would blur CP-36 with CP-39.

## Remaining CP-36 work

1. wire `GET /api/archive/google/status` into `workers/api/src/api.ts`
2. add real-D1/API integration coverage for:
   - missing player id -> stable CP-29 error contract
   - no authorization -> `not_connected`
   - stored authorization -> `connected`
   - response contains no credential fields
3. run workspace typecheck/test/build
4. accept CP-36 and merge to `m4`

## Exit criteria

- provider state can be queried safely for the current player
- connected/not-connected paths are covered by automated tests
- no credential material is returned
- endpoint uses the existing `x-wanderloom-player-id` ownership boundary
- API errors retain the CP-29 stable contract
- existing M3 Google/Drive/archive regressions remain green
- typecheck/test/build/diff-check green

## Scope boundary

Not in CP-36:

- browser UI state rendering -> CP-37
- bypassing consent popup and direct sync reuse -> CP-38
- `invalid_grant` / revocation classification -> CP-39
- reconnect UX -> CP-40
- automatic claim-triggered sync -> CP-41
