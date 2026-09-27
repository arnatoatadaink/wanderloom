# CP-39 — Reauthorization Classification — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Distinguish actual Google Drive authorization loss from temporary Google/provider/network failures, so Wanderloom requests new consent only when stored authorization is no longer usable.

## Accepted behavior

### Reauthorization required

OAuth refresh failures classified as actual credential invalidation, specifically Google OAuth `invalid_grant`, are persisted as:

```text
reauthorization_required = 1
reauthorization_reason = invalid_grant
```

The public Drive connection status becomes:

```text
reauthorization_required
```

Subsequent archive sync attempts do not repeatedly call the Google token endpoint until authorization is repaired.

### Temporary provider failure

Retryable provider/network classes such as:

- HTTP 408
- HTTP 429
- HTTP 5xx
- transient network/unknown transport failure

remain retryable and do **not** mutate the saved authorization to reauthorization-required.

The existing Drive authorization therefore remains logically connected while the provider is temporarily unavailable.

### Successful reauthorization

A successful Google Drive authorization upsert clears any previously persisted reconnect requirement:

```text
reauthorization_required = 0
reauthorization_reason = NULL
```

and reopens pending archive retry through the existing archive authorization recovery path.

## Persistence changes

Migration:

```text
workers/api/migrations/0006_google_drive_reauthorization_state.sql
```

adds persisted reconnect state to `google_drive_authorizations`.

Repository support:

```text
D1GoogleDriveAuthorizationRepository.findByPlayerId()
D1GoogleDriveAuthorizationRepository.upsert()
D1GoogleDriveAuthorizationRepository.markReauthorizationRequired()
```

## OAuth classification

`GoogleOAuthClient` now preserves provider error details from token responses.

`classifyGoogleOAuthFailure()` defines stable categories:

```text
invalid_grant
  -> reauthorization_required

408 / 429 / 5xx
  -> provider_retryable

other OAuth failures
  -> provider_non_retryable

network / unknown transport
  -> provider_retryable
```

Ordinary provider outages are not converted into repeated consent prompts.

## API contract

Archive sync now exposes separate stable public errors:

```text
google_drive_reauthorization_required
  retryable: false

google_drive_provider_unavailable
  retryable: true
```

The production Worker entry routes `/api/archive/sync` through the CP-39 classified sync service.

`GET /api/archive/google/status` returns:

```text
not_connected
connected
reauthorization_required
```

without exposing refresh-token material or the internal stored reason.

## Acceptance evidence

User-verified local validation on 2026-09-27:

```text
pnpm --filter @wanderloom/api typecheck
PASS

pnpm --filter @wanderloom/api test
Test Files  24 passed (24)
Tests       76 passed (76)
```

The CP-39 integration coverage verifies:

- `invalid_grant` persists reconnect-required state,
- status becomes `reauthorization_required`,
- temporary 503-style/provider failure leaves authorization connected,
- already-invalid authorization does not repeatedly refresh OAuth,
- M2/M3 gameplay and archive regression suites remain green.

## Exit criteria

- stable authorization-loss classification: **PASS**
- retryable provider failures remain recoverable/pending: **PASS**
- authorization state changes only for actual credential invalidation: **PASS**
- typecheck and regression tests green: **PASS**

## Result

CP-39 is **Accepted / Complete**.

Next critical-path item:

**CP-40 — Nonblocking Drive Recovery UX**
