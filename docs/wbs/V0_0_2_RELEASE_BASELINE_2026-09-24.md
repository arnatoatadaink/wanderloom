# v0.0.2 Release Baseline — 2026-09-24

## Status

**Released / baseline fixed**

## Release identity

- Version: `v0.0.2`
- Milestone: M2 Solo Progression Slice
- Main merge commit: `d0b0dcc3fc31d0ff628563c0f8742e3c67a338ac`
- Release baseline commit: `5a85b911fb164fcb5a59d561f9898cb0bf62fc27`
- Annotated tag: `v0.0.2`
- Tag target: `5a85b911fb164fcb5a59d561f9898cb0bf62fc27`
- Source integration branch: `m2`
- Release PR: #12

## Acceptance basis

- CP-20 through CP-27: Complete
- Workspace typecheck: PASS
- Automated tests at final CP-27 acceptance: 81 PASS
- Real-D1 M2 acceptance: PASS
- Manual browser acceptance: PASS
- Blocking defects: none
- M2 manual acceptance recorded on 2026-09-24

## Release scope

v0.0.2 adds:

- expedition failure / retained-loss policy
- EXP and level progression
- rarity-bearing drops
- multiple zone/duration expedition choices
- equipment effects frozen into exploration state
- deterministic balance simulation
- M2 risk/reward/rarity API and low-bandwidth UI
- real-D1 migration/concurrency/retry regressions
- end-to-end success/equip/restart acceptance flow

## Explicitly provisional

The following remain provisional and are not production-approved balance:

- zone content/names
- expedition durations
- failure probabilities
- Gold/EXP retention ratios
- rarity weights
- reward/drop counts
- equipment stat modifiers
- progression curve values

## Post-v0.0.2 boundary

New gameplay or platform work should branch from the fixed `v0.0.2` / main baseline.

Post-M2 planning should be maintained separately from this release baseline.
