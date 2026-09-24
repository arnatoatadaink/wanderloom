# CP-29 Production Contract Hardening — 2026-09-24

## Status

**In progress**

## Objective

Freeze the cross-cutting contracts needed before CP-30 account linking and CP-31/33 external Google integrations.

## Implemented

### Stable API error envelope

Added `workers/api/src/api-contract.ts`.

Public API errors now have:

- stable `code`
- central HTTP status mapping
- explicit `retryable`
- optional structured `details`

Current retryable reconciliation outcomes:

- `version_conflict`
- `already_claimed`

All other current public errors are non-retryable by default.

### Route integration

Existing Worker routes now produce the central envelope rather than constructing incompatible response objects ad hoc.

Existing machine-readable `error.code` values are preserved.

### Web client integration

`ApiError` now exposes:

- HTTP status
- code
- retryable
- details
- original body

This gives CP-30+ one stable Web reconciliation surface.

### ADR baseline

Added `docs/adr/ADR-0001_PRODUCTION_CONTRACT_BOUNDARIES_2026-09-24.md`.

It records:

- provider-independent game-core
- Worker-owned external integrations
- D1 gameplay authority
- async/non-authoritative long-term archive
- stable error envelope
- current static-quality baseline

### Lint baseline decision

CP-29 intentionally does **not** add ESLint or another lint dependency.

For M3 the required static baseline is the already-enforced strict TypeScript configuration, tests, build/dry-run, and diff check. A future lint tool requires an explicit rule/migration decision rather than default rules.

## Compatibility intent

This CP preserves existing `error.code` values.

The response shape gains `retryable` and moves code-specific metadata under `details`. Tests must prove current callers still classify errors correctly.

## Validation required

Run:

- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`
- `git diff --check`
- `git status --short`

Expected test increase from CP-28:

- Worker: +3 tests
- Web: +1 test
- game-core: unchanged

If all tests are discovered, expected total: **91 tests**.

## Exit criteria

CP-29 closes when:

- central API error-code/status/retry contract passes tests
- Worker routes use the central error envelope
- Web client preserves retryability/details
- v0.0.2 / CP-28 regressions remain green
- ADR and static-quality baseline are recorded
- full workspace validation passes

Next CP: **CP-30 Guest → Linked Account Domain**.
