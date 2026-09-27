# Post-M4 WBS Handoff — 2026-09-27

## Status

**Planning baseline after M4**

M4 closes with CP-42 and the immutable `v0.0.4` main/tag baseline. New work must not reopen M4 acceptance.

## Closed milestone

**M4 — Seamless Persistence UX**

```text
CP-36  Drive Connection Status Contract          ✅
CP-37  Web Persistence State Model               ✅
CP-38  Existing Authorization Reuse              ✅
CP-39  Reauthorization Classification            ✅
CP-40  Nonblocking Drive Recovery UX             ✅
CP-41  Best-Effort Archive Sync Trigger          ✅
CP-42  Full M4 Acceptance                        ✅
```

Fixed release baseline:

- `v0.0.4`
- tag target `ba154ed6b7cab1caf1a7989a665c501003a3e060`
- annotated tag object `ba5173533a413834a922485c86fca94297543961`
- aggregate regression: 57 files / 189 tests PASS
- Playwright Chromium recovery cases: 6 PASS
- migrations 0001–0006 verified
- workspace typecheck/build and Wrangler dry-run PASS

Authoritative baseline record:

- `docs/wbs/V0_0_4_BASELINE_FIXED_2026-09-27.md`

## Remaining Post-M4 workstreams

### P3-B — Release / Deployment Hardening — **next critical path**

This becomes M5.

Scope:

- production/staging environment separation
- remote D1 migration safety and repeatable procedure
- secret/config provisioning and validation
- deploy/rollback runbook
- post-deploy health/smoke verification
- operational logging/error policy that excludes identity secrets

### P3-C — Gameplay Continuation — backlog after M5 planning checkpoint

- progression/content expansion
- additional zones/durations/reward curves
- equipment/item depth
- failure/recovery mechanics
- balance/retention iteration from CP-28 simulator baseline

### P3-D — Archive Lifecycle — backlog

M4 completed connection/recovery and claim-triggered best-effort sync, but lifecycle policy remains open:

- resume-time pending archive handling
- retry/backoff policy
- visible synchronization state/history
- repair/resync tooling
- retention review as archive volume grows

### P3-E — Monetization / Low-Bandwidth Delivery — backlog

- standard advertising first
- rewarded advertising after gameplay UX stabilizes
- MOR/payment evaluation later
- preserve low-bandwidth-first payload constraints

## Recommended sequencing

```text
v0.0.4 / M4 fixed
  |
  +-> M5 Release & Deployment Hardening
  |     CP-43 .. CP-49
  |
  +-> next gameplay milestone definition
  |
  +-> archive lifecycle automation
  |
  +-> monetization after production/runtime baseline is stable
```

## Boundary rules

- D1 remains gameplay authority.
- Google Drive remains optional archive storage and must not gate gameplay.
- Production secrets must never be committed.
- Remote D1 migration must be explicit, inspectable and reversible-by-procedure where schema semantics allow.
- Production/staging resource names and bindings must not silently target the same D1 database.
- Operational logs must not contain Google credentials, refresh tokens, access tokens, raw ID tokens, or other secret material.

## Next action

M5 is defined in `docs/wbs/M5_RELEASE_DEPLOYMENT_HARDENING_DEFINITION_2026-09-27.md`.

Implementation resumes with **CP-43 — Deployment Environment Model** from the synchronized `main` / `v0.0.4` baseline.
