# v0.0.3 Release Candidate — 2026-09-26

## Status

**Ready for main integration**

## Release identity

- Version: `v0.0.3`
- Milestone: M3 — Productionized Persistent Solo Slice
- Source branch: `m3`
- Release branch: `release/v0.0.3`

## Acceptance basis

- CP-28 through CP-35: Complete / Accepted
- Workspace typecheck: PASS
- Automated tests: 140 PASS
  - Web: 16
  - game-core: 65
  - Worker: 59
- Web production build: PASS
- game-core build: PASS
- Worker Wrangler dry-run: PASS
- Local D1 migrations: current through `0005`
- Browser acceptance: PASS
- Blocking defects: none

## v0.0.3 scope

M3 productionizes the persistent solo slice with:

- guest-first player creation
- Google-linked account restore
- provider-independent external identity rules
- stable API error contracts
- encrypted Google Drive refresh-token persistence
- appDataFolder archive export
- retry and idempotency handling
- archive delivery concurrency lease
- real-D1 persistence and concurrency coverage
- preserved M2 progression/equipment/gameplay behavior
- full guest -> identity -> gameplay -> archive-sync acceptance coverage

## Acceptance fixes included

Final CP-35 browser acceptance also fixed:

- stale busy state after Google restore (`Starting…` stuck until reload)
- Google Drive popup cancellation escalating into a global gameplay error

Both were revalidated manually without page reload.

## Deferred / Post-M3

The following are intentionally outside v0.0.3 and remain Post-M3:

- persistent Drive connection-state UX
- automatic archive sync policy
- explicit Drive reconnect / revoked-grant UX
- further production auth/session UX hardening
- M4 gameplay/product scope

Planning sources:

- `docs/wbs/POST_M3_WBS_HANDOFF_2026-09-26.md`
- `docs/wbs/POST_M3_GOOGLE_IDENTITY_DRIVE_PERSISTENCE_UX_PLAN_2026-09-26.md`

## Release procedure

1. merge `release/v0.0.3` to `main`
2. record the resulting main merge commit in the release baseline document
3. create annotated tag `v0.0.3`
4. fix the release baseline
5. begin Post-M3 / M4 planning from the v0.0.3 main baseline
