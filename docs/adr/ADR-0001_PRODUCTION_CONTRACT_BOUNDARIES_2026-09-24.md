# ADR-0001 Production Contract Boundaries — 2026-09-24

## Status

Accepted for M3 / CP-29.

## Context

v0.0.2 proved the solo gameplay loop, but CP-30+ will add external identity and archive integrations. Those integrations need stable boundaries before provider-specific code is introduced.

## Decision

### API errors

Public API failures use one envelope:

```json
{
  "ok": false,
  "error": {
    "code": "stable_machine_code",
    "retryable": false,
    "details": {}
  }
}
```

Rules:

- `code` is the stable client branching key.
- `retryable` describes whether client reconciliation/retry is expected to be safe/useful.
- `details` contains structured context and is not the primary branching key.
- HTTP status remains meaningful and is mapped centrally.
- Provider-specific errors introduced in later CPs must be translated into Wanderloom API codes before reaching the Web client.

### Domain / integration authority

- `packages/game-core` remains provider-independent.
- Worker code owns D1, OIDC, Google Drive, HTTP and other external integration concerns.
- D1 remains gameplay-authoritative.
- Long-term archive synchronization must not reverse an already committed gameplay mutation.

### Static-quality baseline

No new linter dependency is introduced in CP-29.

The current mandatory baseline remains:

- TypeScript `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- workspace typecheck
- deterministic unit/integration tests
- production build/dry-run
- `git diff --check`

A dedicated linter may be introduced later only with an explicit rule set and migration plan. This avoids adding a tool whose default rules would become accidental project policy.

## Consequences

CP-30 account-linking domain errors can extend the central error-code list without inventing a second response shape.

CP-31 Google OIDC errors remain integration-layer concerns and are translated to the public contract.

CP-32/33 archive failures must likewise map to stable public/internal contracts rather than leaking raw provider errors.
