# v0.0.4 Release Baseline — 2026-09-27

## Status

**Prepared / M4 Complete / Pending main integration and tag**

## Release identity

- Version: `v0.0.4` (provisional until main integration/tag)
- Milestone: M4 — Seamless Persistence UX
- M4 integration branch: `m4`
- CP-42 merge commit on `m4`: `865590ab91fb7baa88e7b4c41b8b6060e301cb93`
- Release tag: pending
- Main release PR: https://github.com/arnatoatadaink/wanderloom/pull/31

## Acceptance basis

- CP-36 through CP-42: Complete / Accepted
- packages/game-core: 19 files / 65 tests PASS
- apps/web: 14 files / 48 tests PASS
- workers/api: 24 files / 76 tests PASS
- Aggregate: 57 files / 189 tests PASS
- Workspace typecheck: PASS
- Workspace build: PASS
- Wrangler 4.132.0 deploy --dry-run: PASS
- D1 migrations `0001` through `0006`: verified
- Local D1 migration `0006`: applied successfully
- Normal-path browser verification: PASS (user-reported)
- API-mocked Chromium failure-path verification: PASS — 6 Playwright tests
- Browser test typecheck and existing web tests/build: PASS

Browser evidence records:

- `docs/wbs/M4_LOCAL_BROWSER_ACCEPTANCE_2026-09-27.md`
- `docs/wbs/M4_BROWSER_FAILURE_RUNBOOK_2026-09-27.md`

Failure-path browser evidence uses the real Web app with mocked Worker API and
Google SDK responses. Live Google popup/credential revocation tests remain
unverified and are a recorded limitation. Backend classification/persistence is
covered separately by the CP-39 regression suite.

Primary acceptance record:

- `docs/wbs/CP-42_FULL_M4_ACCEPTANCE_2026-09-27.md`

## Fixed M4 scope

`v0.0.4` prepares the Seamless Persistence UX baseline:

- explicit Google Drive connection-state contract
- web persistence state model for connected, disconnected, reconnect-required and temporary-unavailable states
- reuse of valid stored Drive authorization without repeated OAuth consent
- stable OAuth failure classification
- persisted `reauthorization_required` state for actual `invalid_grant` credential invalidation
- transient provider/network failures remain retryable without mutating authorization state
- explicit reconnect / retry / sync recovery actions
- Drive busy state isolated from gameplay busy state
- popup cancellation and Drive failures remain nonblocking to gameplay
- returning stored players can act on persisted Drive status
- successful claims may trigger background best-effort archive sync
- automatic archive sync never opens OAuth consent for disconnected or reconnect-required states
- Drive archive remains non-authoritative; D1/gameplay claim state is authoritative

## Migration delta from v0.0.3

M4 adds:

- `0006_google_drive_reauthorization_state.sql`

This persists reconnect-required state and reason internally while the public Drive connection-status API exposes only safe connection metadata.

## Release boundary

The following remain outside M4 and do not block `v0.0.4`:

- deployment/environment production hardening beyond current dry-run acceptance
- gameplay/content expansion beyond the current solo slice
- party/caravan systems
- equipment loss/recovery mechanics
- monetization implementation
- broader archive lifecycle policy beyond the current Drive best-effort path

## Finalization steps

Before fixing `v0.0.4` as the immutable release baseline:

1. merge `m4` into `main`,
2. rerun/confirm release acceptance on the resulting main commit if required,
3. create annotated tag `v0.0.4` targeting the fixed main baseline commit,
4. update this document with the main merge commit, tag target, tag object and release PR,
5. produce a fixed-baseline record analogous to `V0_0_3_BASELINE_FIXED_2026-09-27.md`.

Until those steps are complete, this document is the prepared M4 release baseline, not yet the immutable tagged main reference.
