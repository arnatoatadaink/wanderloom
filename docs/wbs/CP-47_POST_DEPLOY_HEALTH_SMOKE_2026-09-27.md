# CP-47 — Post-Deploy Health / Smoke Verification — 2026-09-27

## Status

**Planned — starts after CP-46 merge**

## Objective

Define deterministic post-deploy verification for staging and production, covering health, guest bootstrap, playable-loop smoke, migration state, and safe identity/archive checks without leaking credentials.

## Planned outcomes

- target URL/environment is explicit,
- `/api/health` is checked first,
- guest bootstrap succeeds,
- player state/start/claim path is exercised,
- D1 migration state is verified,
- linked Google/Drive checks are included only when safe credentials are available,
- smoke failures block promotion/release completion,
- output is suitable for release evidence without secret values.

## Entry criteria

- CP-43 through CP-46 Accepted.

## Non-goals

- production deployment itself,
- destructive D1 recovery,
- browser-hosting-provider selection,
- operational logging policy (CP-48).
