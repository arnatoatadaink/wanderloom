# v0.0.3 Baseline Fixed — 2026-09-27

## Status

**Fixed / Tagged / Main baseline**

## Release identity

- Version: `v0.0.3`
- Milestone: M3 — Productionized Persistent Solo Slice
- Main release merge commit: `afb694de16aa606e89c7c69211e6b018573afd30`
- Release baseline commit / tag target: `0a8e5d08fd9bb1f2179228d8eee4e97fa08d7e20`
- Annotated tag: `v0.0.3`
- Release PR: #22

## Acceptance basis

- CP-28 through CP-35: Complete / Accepted
- Web: 16 tests PASS
- game-core: 65 tests PASS
- Worker: 59 tests PASS
- Total: 140 tests PASS
- Workspace typecheck: PASS
- Production builds / Worker dry-run: PASS
- Local D1 migrations through `0005`: current
- Google restore browser acceptance: PASS
- Start / claim / result without reload: PASS
- Drive popup cancellation remains nonblocking: PASS
- Drive retry / archive sync: PASS
- Post-sync gameplay continuation: PASS

## Fixed release scope

`v0.0.3` fixes the M3 production-oriented persistent solo baseline:

- guest-first player bootstrap
- Google-linked account restore using stable provider subject ownership
- provider-independent account-linking domain rules
- stable API error contracts
- Google Drive `appDataFolder` archive export
- encrypted refresh-token persistence
- archive retry / idempotency semantics
- archive delivery lease / concurrency hardening
- retained M2 progression, rarity, equipment, failure and exploration behavior

## Deferred boundary

The following are explicitly Post-M3 and do not reopen `v0.0.3`:

- Drive connection-status UX
- reusing valid Drive authorization without prompting again
- explicit reauthorization-required classification
- automatic / best-effort archive sync UX
- deployment/environment hardening
- next gameplay/content expansion
- monetization work

Planning sources:

- `docs/wbs/POST_M3_WBS_HANDOFF_2026-09-26.md`
- `docs/wbs/POST_M3_GOOGLE_IDENTITY_DRIVE_PERSISTENCE_UX_PLAN_2026-09-26.md`

## Branching rule

New implementation work should branch from the `v0.0.3` / current `main` baseline or from an explicitly accepted planning branch based on that baseline.

`v0.0.3` is now the immutable M3 reference point.
