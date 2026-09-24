# CP-29 Production Contract Hardening — 2026-09-24

## Status

**Accepted / Complete**

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

## Acceptance evidence

User-reported local WSL validation on 2026-09-24:

- `pnpm -r typecheck`: PASS across Web / game-core / Worker.
- `pnpm -r test`: PASS.
  - Web: 3 files / 11 tests.
  - game-core: 17 files / 50 tests.
  - Worker: 12 files / 30 tests.
  - Total: **91 tests PASS**.
- `pnpm -r build`: PASS on the preceding CP-29 validation run.
  - Web production build: PASS.
  - game-core TypeScript build: PASS.
  - Worker Wrangler dry-run: PASS.
- `git diff --check`: clean.
- `workers/api/.wrangler/` remains an untracked local runtime directory and is not repository content.

During validation, CP-19/26 regression expectations were updated to the new stable error envelope (`code` + `retryable` + `details`). The underlying gameplay/persistence behavior remained green.

## Exit criteria

All CP-29 exit criteria are satisfied:

- central API error-code/status/retry contract passes tests
- Worker routes use the central error envelope
- Web client preserves retryability/details
- v0.0.2 / CP-28 regressions remain green
- ADR and static-quality baseline are recorded
- full workspace validation passes

CP-29 is **Accepted / Complete**.

Next CP: **CP-30 Guest → Linked Account Domain**.
