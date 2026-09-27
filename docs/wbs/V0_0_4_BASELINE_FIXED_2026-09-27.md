# v0.0.4 Baseline Fixed — 2026-09-27

## Status

**Fixed / Tagged / Main baseline**

## Release identity

- Version: `v0.0.4`
- Milestone: M4 — Seamless Persistence UX
- Release PR: https://github.com/arnatoatadaink/wanderloom/pull/31 (merged)
- Main release merge commit / tag target: `ba154ed6b7cab1caf1a7989a665c501003a3e060`
- Annotated tag object: `ba5173533a413834a922485c86fca94297543961`
- Remote annotated tag: `v0.0.4`
- Accepted m4 head: `16735d5d1b9e28f5b66558405c9ae81682aad5ff`

## Acceptance on the actual main merge commit

- CP-36 through CP-42: Complete / Accepted
- Migration file set 0001–0006: PASS
- Workspace typecheck: PASS
- game-core: 19 files / 65 tests PASS
- Web: 14 files / 48 tests PASS
- Worker: 24 files / 76 tests PASS
- Aggregate: 57 files / 189 tests PASS
- Workspace builds and Wrangler 4.132.0 deploy dry-run: PASS
- Browser-test typecheck: PASS
- Playwright Chromium: 6 tests PASS / 28.5s
- Runner and browser verification: exit 0
- Runtime: Node 22.20.0 / pnpm 10.17.1 / Playwright 1.63.0
- Main merge tree equals the tested m4 head
- Local D1 migration 0006: user-reported successful application
- Normal browser paths: user-reported PASS (resume, connected sync, claim,
  F5, cookie deletion followed by F5, local server restart)

The 6 Chromium cases exercise the actual Web application with mocked API/GIS
responses: claim remains independent of pending/failed sync; network, 429 and
503 retries avoid new consent; reconnect is explicit; SDK popup cancellation
does not block gameplay and permits retry.

## Validation limits

Live Google credential revocation, live Drive outages and actual Google popup
cancellation remain unverified. API-mocked Chromium evidence verifies client/UI
behavior; existing CP-39 tests separately cover server classification and
persisted reconnect markers. This is a source baseline, not a production
deployment. Remote D1 migration and production deployment were not performed.
Local runtime data and credentials were preserved and not committed.

## Fixed scope and follow-up

M4 fixes connection-status contracts, stored authorization reuse, explicit
nonblocking recovery, and best-effort archive synchronization after reward claim.

Future automatic-sync design should define resume-time pending-archive handling,
retry policy and visible synchronization status. Keep gameplay authoritative in
D1 and require explicit consent when Drive connection or reauthorization is
needed. This follow-up does not reopen the immutable M4 baseline.
Deployment hardening, gameplay expansion and monetization remain separate work.

## Evidence references

- `CP-42_FULL_M4_ACCEPTANCE_2026-09-27.md`
- `M4_LOCAL_BROWSER_ACCEPTANCE_2026-09-27.md`
- `M4_BROWSER_FAILURE_RUNBOOK_2026-09-27.md`
- `V0_0_4_RELEASE_BASELINE_2026-09-27.md`

New work should branch from v0.0.4 or the synchronized main baseline.
