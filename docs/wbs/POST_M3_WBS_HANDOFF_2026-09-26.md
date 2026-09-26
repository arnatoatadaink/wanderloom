# Post-M3 WBS Handoff — 2026-09-26

## Status

**Planning baseline after M3**

M3 closes with CP-35. New product/design work starts from this document rather than extending the M3 critical path.

## Closed milestone

**M3 — Productionized Persistent Solo Slice**

```text
CP-28  Balance Measurement Baseline           ✅
CP-29  Production Contract Hardening           ✅
CP-30  Guest -> Linked Account Domain           ✅
CP-31  Google OIDC Integration                  ✅
CP-32  Archive Export Contract                  ✅
CP-33  appDataFolder Sync + Retry               ✅
CP-34  Persistence / Identity Concurrency       ✅
CP-35  Full M3 Acceptance                       ✅
```

Acceptance baseline:

- 140 tests PASS
- typecheck PASS
- production builds / Worker dry-run PASS
- migrations 0001-0005 current
- real Google restore accepted
- real Drive authorization / archive sync accepted
- gameplay continues after restore and sync

## Post-M3 workstreams

The items below are planning candidates. They are not M3 blockers.

### P3-A — Google identity / Drive persistence UX

Source design:

`docs/wbs/POST_M3_GOOGLE_IDENTITY_DRIVE_PERSISTENCE_UX_PLAN_2026-09-26.md`

Provisional CP decomposition:

```text
GID-01  Connection status contract/API
GID-02  Web connection-state model
GID-03  Skip consent popup when authorization remains usable
GID-04  Reauthorization-required classification
GID-05  Drive-specific nonblocking error UX
GID-06  Best-effort archive sync trigger
GID-07  Full persistence/revocation acceptance
```

Key rule:

- Google login session remains Google-managed.
- Wanderloom persists provider `sub` -> player ownership in D1.
- Drive refresh token remains encrypted server-side.
- access tokens are not long-term browser state.
- normal gameplay must not depend on Drive availability.

Priority recommendation: **early Post-M3 hardening**, before wider production exposure, but not required to reopen M3.

### P3-B — Release / deployment hardening

Candidate work:

- production/staging environment separation
- remote D1 migration procedure
- secret provisioning checklist
- deployment rollback/runbook
- health/smoke verification after deploy
- structured error/telemetry policy without leaking identity secrets

### P3-C — Gameplay continuation

Candidate work to be detailed in the next gameplay milestone:

- expand progression beyond the current Solo Progression Slice
- additional zones/durations/reward curves
- equipment/item depth
- failure/recovery mechanics deferred from M2
- retention/balance measurement using CP-28 simulator baseline

Subjective balance tuning remains separate from persistence correctness.

### P3-D — Archive lifecycle

Candidate work:

- automatic/best-effort export scheduling
- archive retention and historical browsing policy
- Drive authorization revocation handling
- archive repair/resync tooling
- D1 recent-archive retention review as history volume grows

### P3-E — Monetization / low-bandwidth delivery

Still outside the M3 critical path:

- standard advertising first
- rewarded advertising only after gameplay loop UX is stable
- payment/MOR evaluation later
- preserve low-bandwidth-first payload and mobile constraints

## Recommended next sequencing

```text
M3 closed
  |
  +-> release/deployment baseline
  |
  +-> Google/Drive persistence UX hardening
  |
  +-> next gameplay milestone definition
       |
       +-> balance/content expansion
       +-> archive lifecycle automation
       +-> monetization when UX baseline is stable
```

Do not force all Post-M3 work into one milestone. The next WBS review should choose a single primary objective and assign new CP numbers from that objective.

## Carry-over observations

### Accepted, not a blocker

Google Drive consent popup can be cancelled by the user. CP-35 changed this from a global application error to a local Drive error, and retry succeeds.

### Design improvement queued

The UI currently exposes `Enable Drive archive` even though a previously stored encrypted refresh token may still be usable. Future work should query connection state and avoid unnecessary reauthorization.

### Security boundary retained

Do not store Google passwords, Google session cookies, raw refresh tokens, or long-lived access tokens in client storage.

## Next planning action

At the start of the next implementation session:

1. choose the next milestone objective,
2. assign CP numbers,
3. move only the relevant section of this handoff into the critical path,
4. leave the remaining workstreams as backlog.

This document is the handoff point from completed M3 into the next WBS/CP planning cycle.
