# Post-M2 WBS / Backlog Rebaseline — 2026-09-24

## Status

**Draft for planning**

Baseline: `v0.0.2` / M2 Solo Progression Slice.

This document supersedes the stale post-M1 planning portions of
`WBS_CP_UPDATE_2026-09-18.md` for work after v0.0.2.

## Planning principle

Post-M2 work is separated into:

1. **release-hardening / productionization**
2. **account and archive reliability**
3. **gameplay expansion**
4. **commercialization**
5. **later AI/social features**

Items are not treated as one linear critical path unless they are prerequisites
for the next milestone.

## W0 — Project / quality baseline

### W0-PM-001 WBS rebaseline
- Status: in progress
- Replace stale M1-era blocker lists with v0.0.2-based planning.

### W0-PM-002 lint baseline
- Status: unresolved
- Establish a deliberate lint policy rather than inheriting an accidental one.

### W0-PM-003 ADR baseline
- Status: unresolved
- Record architectural decisions that now have production consequences.

### W0-PM-004 API error contract
- Status: unresolved
- Normalize public error codes and client reconciliation expectations.

### W0-PM-005 compact number formatting
- Status: unresolved / UI polish
- Not a hard blocker for the next milestone.

## W1 — Production balance / onboarding

### W1-PM-001 balance target definition
Define measurable targets before tuning:
- expected retained Gold/EXP per minute
- level pacing
- drop frequency
- rarity distribution
- failure impact
- zone/duration differentiation

### W1-PM-002 simulator scenario set
Extend CP-24 simulator fixtures into named tuning scenarios.

### W1-PM-003 tune provisional M2 constants
Replace smoke-only values only after measurement.

### W1-PM-004 onboarding/training decision
Resolve the deferred v0.0.1 question:
- keep local zero-reward tutorial only, or
- add an API-backed onboarding grant/training zone.

If a server grant is adopted, require:
- server-side idempotency
- reload/retry/multi-tab safety
- auditable event classification
- no use of local tutorial elapsed time as anti-cheat evidence

### W1-PM-005 balance acceptance report
Record measured values separately from subjective gameplay judgment.

## W2 — Identity / account reliability

### W2-PM-001 account-linking contract
Define guest → linked-account semantics without invalidating existing guest data.

### W2-PM-002 OIDC provider boundary
Keep provider-specific data outside game-core.

### W2-PM-003 account-link idempotency
Protect repeated callbacks / retries / multi-tab linking.

### W2-PM-004 account recovery / conflict policy
Define behavior if an external identity is already linked elsewhere.

### W2-PM-005 privacy/minimal-data review
Store only data required for identity linkage.

## W3 — Archive / Google appDataFolder

### W3-PM-001 archive export contract
Define immutable archive export payload and versioning.

### W3-PM-002 appDataFolder adapter
Implement Google Drive appDataFolder as the initial long-term archive target.

### W3-PM-003 pending-sync worker/service
Export pending recent_archive entries without blocking gameplay claims.

### W3-PM-004 retry / idempotency
Ensure duplicate export attempts cannot create ambiguous archive state.

### W3-PM-005 D1 retention policy
Measure whether recent archive retention should remain 1–5 and pick a production value.

### W3-PM-006 archive compaction / restore boundary
Define what is recoverable from archive and what remains authoritative in D1.

## W4 — High-risk exploration

### W4-PM-001 owned-equipment-loss contract
Design the previously deferred possibility of losing existing equipment.

### W4-PM-002 protection rules
Define insured/protected slots or consumable protection.

### W4-PM-003 recovery events
Define recovery/retrieval gameplay before enabling permanent loss.

### W4-PM-004 risk preview extension
Clearly separate generated-reward loss from owned-item risk.

### W4-PM-005 atomic persistence / retry coverage
No owned-item loss may ship without real-D1 concurrency/retry tests.

## W5 — Social gameplay

### W5-PM-001 Party domain
Deferred.

### W5-PM-002 Caravan domain
Deferred.

### W5-PM-003 solo competitiveness constraints
Any social mechanics must preserve the accepted solo-first product direction.

### W5-PM-004 social persistence/API/UI
Deferred until the domain contract is accepted.

## W6 — Monetization

### W6-PM-001 standard ads
Candidate first revenue feature.

### W6-PM-002 ad metrics
Measure impressions/click/view events without coupling gameplay authority to the ad client.

### W6-PM-003 rewarded ads
Requires explicit anti-abuse/idempotent reward contract.

### W6-PM-004 billing / Merchant of Record
Deferred until direct payment scope is selected.

### W6-PM-005 entitlement
Required before paid account/gameplay benefits.

### W6-PM-006 premium currency
Deferred; do not introduce before economy/balance boundaries are stable.

## W7 — AI features

### W7-PM-001 pre-generated AI content
Deferred.

### W7-PM-002 daily appraisal / identification
Deferred.

### W7-PM-003 monetized AI actions
Deferred until cost and entitlement model are defined.

## Cross-cutting validation

Every milestone after v0.0.2 should preserve:

- deterministic game-core tests
- real-D1 integration tests where persistence changes
- optimistic concurrency / retry safety
- exactly-once reward semantics
- snapshot/payload measurement
- low-bandwidth Web constraints
- browser manual acceptance before release tagging

## Candidate ordering

Recommended dependency ordering:

```text
v0.0.2
↓
Production/balance measurement
↓
Identity + archive reliability
↓
High-risk gameplay
↓
Monetization / social / AI as separately approved milestones
```

This is a planning recommendation, not yet an accepted milestone sequence.
