# v0.0.3 Release Baseline — 2026-09-26

## Status

**Main integration complete / annotated tag pending local creation**

## Release identity

- Version: `v0.0.3`
- Milestone: M3 — Productionized Persistent Solo Slice
- Main merge commit: `afb694de16aa606e89c7c69211e6b018573afd30`
- Source integration branch: `release/v0.0.3`
- M3 branch: `m3`
- Release PR: #22

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
- Local D1 migrations current through `0005`
- Final browser acceptance: PASS
- Blocking defects: none

## Release scope

v0.0.3 adds the M3 productionized persistent solo baseline:

- guest-first player creation
- Google-linked account restore
- provider-independent external identity rules
- stable production API error contracts
- encrypted Google Drive refresh-token persistence
- appDataFolder archive export
- retry/idempotency semantics
- D1-backed archive delivery lease and recovery
- real-D1 identity/archive concurrency coverage
- retained M2 progression/equipment/gameplay behavior
- full guest -> identity -> gameplay -> archive-sync acceptance scenario

## Acceptance fixes included

Final CP-35 browser validation identified and fixed:

- stale `busy` state after Google restore, which left `Starting…` stuck until reload
- Drive authorization popup cancellation incorrectly escalating to a global gameplay error

Both fixes were revalidated manually without page reload.

## Deferred / Post-M3 boundary

The following remain outside v0.0.3 by design:

- Google/Drive persistent connection-state UX
- automatic archive-sync policy
- reconnect / revoked-grant UX
- further auth/session production hardening
- M4 gameplay/product scope

Planning sources:

- `docs/wbs/POST_M3_WBS_HANDOFF_2026-09-26.md`
- `docs/wbs/POST_M3_GOOGLE_IDENTITY_DRIVE_PERSISTENCE_UX_PLAN_2026-09-26.md`

## Tag procedure

Create the annotated tag from this release-baseline commit after pulling `main` locally:

```bash
git switch main
git pull --ff-only
git tag -a v0.0.3 -m "v0.0.3 - M3 Productionized Persistent Solo Slice"
git push origin v0.0.3
```

After the tag exists remotely, record the tag SHA and mark this baseline fixed.

## Post-v0.0.3 boundary

New implementation work should branch from the v0.0.3 / main baseline.

Post-M3 planning and M4 definition must not retroactively expand the M3 critical path.
