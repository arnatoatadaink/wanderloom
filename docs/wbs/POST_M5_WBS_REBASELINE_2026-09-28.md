# Post-M5 WBS Rebaseline — 2026-09-28

## Status

**Planning baseline after M5**

M5 closes with CP-49 and the immutable `v0.0.5` main/tag baseline. New work must not reopen M5 acceptance. The next milestone name, objective, and CP numbering are intentionally not assigned here; they require a separate M6 planning decision.

## Closed milestone

**M5 — Release & Deployment Hardening**

```text
CP-43  Deployment Environment Model                  ✅
CP-44  Remote D1 Migration Safety                    ✅
CP-45  Secret / Configuration Provisioning Contract ✅
CP-46  Deploy & Rollback Runbook                     ✅
CP-47  Post-Deploy Health / Smoke Verification       ✅
CP-48  Operational Error / Logging Policy            ✅
CP-49  Full M5 Acceptance                            ✅
```

Fixed release baseline:

- release tag: `v0.0.5`
- tag target / main baseline: `2bfb7b54e6f1dca23290ebfd628043871301c75f`
- annotated tag object: `6223ab08f16790097ff8e3e465833074a0a6fd36`
- CP-49 local/source acceptance: PASS
- aggregate regression: 64 files / 212 tests PASS
- workspace typecheck: PASS
- Worker dry-run / build contract: PASS
- Web production build: PASS
- GUI / exploration / claim / persistence regression: PASS
- mobile acceptance: PASS at 390x844

Authoritative acceptance records:

- `docs/wbs/CP-49_M5_LOCAL_ACCEPTANCE_2026-09-28.md`
- `docs/wbs/CP-49_FULL_M5_ACCEPTANCE_2026-09-28.md`
- `docs/wbs/M5_RELEASE_DEPLOYMENT_HARDENING_DEFINITION_2026-09-27.md`

## M5 closure boundary

M5 acceptance proves the source/release-hardening contracts and local acceptance baseline. It does **not** claim completion of real staging or production operations.

The following remain outside the completed M5 acceptance unless separately evidenced:

- provisioning real staging/production resources,
- applying D1 migrations to real remote staging/production databases,
- deploying the Worker to a real staging/production target,
- deploying the Web application to a real staging/production target,
- executing a real rollback,
- executing post-deploy smoke tests against a live remote target,
- collecting and reviewing real operational logs.

These are operational execution items, not retroactive blockers for the accepted `v0.0.5` source baseline.

## Open workstreams carried forward

The following workstreams are intentionally **unassigned to M6** in this document.

### A. Remote Release Execution

Potential work includes:

- provision staging resources,
- verify staging/production resource isolation,
- provision secrets/configuration using the M5 contract,
- inspect and apply remote D1 migrations,
- perform staging deploy,
- execute live smoke verification,
- evaluate production promotion,
- capture deployment evidence and rollback evidence when exercised.

This workstream is ready to use the contracts created by CP-43 through CP-48, but its inclusion in the next milestone is undecided.

### B. Gameplay Continuation

Carried forward from the earlier gameplay backlog:

- progression/content expansion,
- additional zones and durations,
- reward-curve expansion,
- equipment/item depth,
- failure/recovery mechanics,
- party/caravan mechanics when explicitly scheduled,
- balance/retention iteration using the existing simulator and measurement baseline.

No feature in this section is approved for the next milestone by this rebaseline.

### C. Archive Lifecycle

M3/M4 established archive export, Drive integration, connection/recovery UX, and best-effort synchronization. Remaining lifecycle concerns include:

- resume-time handling of pending archive work,
- retry/backoff policy,
- visible synchronization history/state if desired,
- repair/resync tooling,
- archive retention and volume policy,
- archive browsing/history UX.

These remain backlog until prioritized.

### D. Monetization / Low-Bandwidth Delivery

Existing direction remains available but unscheduled:

- preserve low-bandwidth-first payload and interaction constraints,
- standard advertising before more intrusive monetization,
- rewarded advertising only after gameplay UX is sufficiently stable,
- MOR/payment evaluation later,
- measure bandwidth and runtime cost before expanding network-heavy features.

No monetization work is assigned to the next milestone here.

### E. Operational Follow-up

M5 defines operational contracts, but future runtime evidence may expose follow-up work such as:

- log-volume/cost tuning,
- alert thresholds,
- production-only failure classifications,
- migration procedure refinements,
- recovery automation,
- security/configuration hardening found during real deployment.

These are contingent on future operational evidence and should not be pre-declared as defects.

## Dependency view

```text
v0.0.5 / M5 fixed
        |
        +-- Remote Release Execution ---------+
        |                                     |
        +-- Gameplay Continuation ------------+--> next milestone decision
        |                                     |
        +-- Archive Lifecycle ----------------+
        |                                     |
        +-- Monetization / Low-Bandwidth -----+
        |                                     |
        +-- Operational Follow-up ------------+
```

The diagram expresses available workstreams only. It does not establish their priority or assign them to M6.

## Baseline invariants carried forward

The following constraints remain authoritative unless a later ADR or milestone decision explicitly changes them:

- D1 remains gameplay authority.
- Google Drive remains optional archive storage and must not gate gameplay.
- Production secrets must never be committed.
- Staging and production must not silently share the same D1 database.
- Remote D1 migration must remain explicit and inspectable.
- Ordinary application deployment must not silently perform a production migration unless explicitly approved later.
- Operational logs must exclude Google credentials, refresh tokens, access tokens, raw ID tokens, and other secret material.
- Guest gameplay must remain usable when optional Google/Drive persistence is unavailable.
- Low-bandwidth-first remains a product constraint for future client/network expansion.

## WBS state after rebaseline

```text
M1  complete
M2  complete
M3  complete
M4  complete
M5  complete -> v0.0.5 fixed

Post-M5 planning baseline: this document
M6 objective: UNDECIDED
Next CP number/scope: UNASSIGNED
```

No `CP-50` is created by this document. CP numbering should resume only after the next milestone objective and critical path are approved.

## Documentation note

`CP-49_FULL_M5_ACCEPTANCE_2026-09-28.md` was originally created as the planned acceptance definition and may retain planning-era status wording. The executed acceptance outcome is recorded by `CP-49_M5_LOCAL_ACCEPTANCE_2026-09-28.md` and the fixed `v0.0.5` Git baseline. Historical planning wording should not be interpreted as reverting the accepted M5 state.

## Next planning action

Hold a separate M6 scope decision.

That decision should select the milestone objective first, then derive its critical path and only then allocate `CP-50+` identifiers. Candidate selection is intentionally deferred and is not part of this rebaseline.
