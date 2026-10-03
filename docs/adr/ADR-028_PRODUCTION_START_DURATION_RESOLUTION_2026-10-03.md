# ADR-028 — Production Start Duration Resolution

- Status: Proposed for local acceptance
- Date: 2026-10-03
- Scope: production Zone start duration resolution

## Context

PR59 introduced the canonical production Zone catalog and duration definitions. PR60 introduced the production preview contract. The default API start path still delegates duration lookup to `resolveM2SmokeDurationMs`, so production Zone IDs would previously resolve to `null` and return `not_ready` before the existing Zone Rank gate could run.

A full replacement of the M2 smoke runtime is intentionally deferred. The current playable loop must remain usable until production claim resolution and rarity/drop runtime are ready.

## Decision

The existing runtime duration resolver is extended as a compatibility bridge:

1. Resolve the existing M2 smoke Zone/duration pair first.
2. If no smoke duration exists, resolve against the production Zone catalog.
3. Production duration IDs are canonical:
   - `short` = 30 minutes
   - `medium` = 2 hours
   - `long` = 8 hours
4. Unknown Zone/duration combinations continue to resolve to `null`.
5. Existing Zone Rank enforcement remains authoritative in `startExploration` / persistence; duration resolution does not bypass access control.
6. Claim resolution, production rewards, rarity/drop generation, `/api/zones`, and Web cutover remain out of scope for this PR.

## Compatibility

Existing M2 smoke durations retain their current values:

- smoke `short` = 5 minutes
- smoke `long` = 10 minutes

Production fallback occurs only when the requested pair is not found in the M2 smoke catalog.

## Runtime Flow

```text
POST /api/explorations
  -> default resolveDurationMs
     -> M2 smoke lookup
        -> found: existing smoke duration
        -> missing: production catalog lookup
  -> duration found
  -> persistStartedExploration
  -> Zone Rank gate
  -> state-versioned D1 persistence
```

## Acceptance

Local acceptance requires:

- production `short`, `medium`, and `long` resolve to 30m / 2h / 8h;
- smoke duration values remain unchanged;
- unlocked Wayfarer can be started using a resolved production duration;
- locked Mossglass still returns `zone_locked` before repository mutation;
- API package typecheck and tests pass;
- full workspace typecheck and tests pass;
- `git diff --check origin/main...HEAD` is clean.

## Follow-up

The next cutover step is production expedition/claim resolution. That step will replace the M2 smoke reward/failure model for production Zone IDs while preserving the smoke fallback until the final Web/API cutover.
