# CP-13 Balance / Payload Validation — Implementation Note

## Status

Implementation and WSL validation complete on `feat/cp-13-balance-payload-validation`.

## Objective

CP-13 adds measurable technical guardrails for the current M1 smoke loop without treating the provisional smoke values as accepted game balance.

## Snapshot measurement

`packages/game-core` now exports `measureJsonUtf8()`, which measures the UTF-8 byte size of the exact JSON serialization used by snapshots and API payloads.

Current provisional snapshot budgets:

- core snapshot: 4 KiB
- inventory snapshot: 8 KiB
- archive entry: 8 KiB

These are project guardrails, not Cloudflare limits.

## API payload budgets

The real-D1 playable-loop integration test now checks:

- zone catalog: <= 2 KiB
- state response: <= 4 KiB
- inventory response: <= 8 KiB
- claim response: <= 16 KiB

The budgets are intentionally generous relative to the current minimal payloads. Their purpose is to catch accidental payload growth while the low-bandwidth-first contract is still small.

## Web bundle measurement

Added:

`pnpm --filter @wanderloom/web measure:dist`

The command reads the built `dist` tree, ignores source maps, and reports raw and gzip bytes per file plus totals.

Provisional gzip budgets:

- total web payload: <= 20 KiB
- JavaScript: <= 10 KiB
- CSS: <= 5 KiB
- HTML: <= 2 KiB

These are internal technical budgets, not network-transfer guarantees; HTTP headers, compression negotiation, caching, and CDN behavior are outside this measurement.

## Smoke-balance validation

The provisional `m1-smoke` rules remain:

- duration: 5 minutes
- deterministic success
- Gold: 5 per run
- EXP: 10 per run
- drops: 0
- recent archive retention: 3

A CP-13 test confirms the fixture remains deterministic and linear (12 runs => 60 Gold / 120 EXP / 0 drops).

This is not a conclusion that the economy is balanced. Formal balance work remains behind W1-003 through W1-006 and W5-007.

## Important M1 gap

Closing CP-13 will not by itself satisfy the complete M1 Definition of Done.

The current M1 DoD still requires:

- receive a drop
- equip a drop
- concurrent equipment/claim safety

Those depend on unresolved:

- W1-003 Risk/reward interfaces
- W1-004 Seeded resolution
- W1-005 Failure/drop-loss model
- W1-006 Growth model
- W3-009 equipment mutation
- W4-007 inventory/equipment minimum

The smoke loop intentionally has no drops and therefore does not prove those requirements.

## Validation result

WSL validation results recorded so far:

- workspace typecheck: passed
  - `packages/game-core`
  - `apps/web`
  - `workers/api`
- workspace tests: passed
  - `packages/game-core`: 17 tests across 8 files
  - `apps/web`: 6 tests across 3 files
  - `workers/api`: 15 tests across 7 files
- workspace build: passed
  - web Vite build
  - `game-core` TypeScript build
  - Wrangler dry-run build
- Worker dry-run upload: 27.20 KiB / gzip 5.19 KiB
- web dist measurement:
  - total raw: 14,933 bytes
  - total gzip: 5,177 bytes
  - JavaScript gzip: 3,503 bytes
  - CSS gzip: 1,411 bytes
  - HTML gzip: 263 bytes
- all web payload measurements are below the provisional CP-13 budgets
- `git diff --check`: passed

CP-13 is closed as the current exploration-loop balance/payload checkpoint. The remaining M1 gaps above must now be scheduled explicitly rather than treating the prototype as fully complete.
