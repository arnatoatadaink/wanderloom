# M3 Proposed Critical Path — 2026-09-24

## Status

**Proposed / not yet accepted**

Baseline: `v0.0.2`.

## Proposed M3 objective

**Productionized Persistent Solo Slice**

Move the accepted M2 solo loop from provisional local/guest-oriented behavior toward a production-capable persistent player baseline:

- measured rather than accidental balance constants
- stable API/error boundaries
- safe guest → linked-account transition
- OIDC identity boundary
- asynchronous long-term archive export
- retry/idempotency coverage
- end-to-end acceptance without weakening the v0.0.2 solo loop

M3 intentionally does **not** add Party, Caravan, permanent owned-equipment loss,
premium currency, rewarded ads, or AI gameplay.

## Proposed critical path

```text
v0.0.2
↓
CP-28 Balance Measurement Baseline
↓
CP-29 Production Contract Hardening
↓
CP-30 Guest → Linked Account Domain
↓
CP-31 OIDC Integration
↓
CP-32 Archive Export Contract
↓
CP-33 appDataFolder Sync + Retry
↓
CP-34 Persistence / Identity Concurrency
↓
CP-35 Full M3 Acceptance
↓
M3 Productionized Persistent Solo Slice
```

## CP-28 — Balance Measurement Baseline

### Goal
Convert provisional M2 values into explicitly measured candidate configurations without claiming subjective final balance.

### Scope
- define named simulator scenarios
- define measurable targets:
  - retained Gold/minute
  - retained EXP/minute
  - level pacing
  - drop frequency
  - rarity frequency
  - failure loss
  - zone/duration differentiation
- run deterministic CP-24 simulator across those scenarios
- record current smoke values as baseline measurements
- identify values requiring tuning

### Exit
- measurements reproducible
- provisional values clearly separated from candidate production values
- no tuning value accepted without recorded measurement

## CP-29 — Production Contract Hardening

### Goal
Resolve small cross-cutting technical debt before external identity/storage integration.

### Scope
- public API error contract
- retry/reconciliation expectations
- lint baseline
- architecture decision records for:
  - authority boundaries
  - guest identity
  - external identity linkage
  - long-term archive authority
- confirm snapshot/schema versioning expectations for upcoming changes

### Exit
- external integrations can depend on documented stable boundaries

## CP-30 — Guest → Linked Account Domain

### Goal
Define pure, provider-independent account-linking behavior.

### Required behavior
- existing guest progress is preserved
- repeated link attempts are idempotent
- an external identity cannot silently overwrite another player
- link conflict is a typed domain/API outcome
- provider-specific tokens never enter game-core

### Exit
- domain tests cover first link, retry, already-linked, and conflicting-link cases

## CP-31 — OIDC Integration

### Goal
Add one real OIDC path behind the CP-30 contract.

### Scope
- login initiation/callback boundary
- minimal external identity mapping
- secure server-side validation
- link to existing guest player
- restore linked player identity on a new browser/session

### Explicit non-goals
- passwords
- payment identity
- broad profile collection

### Exit
- local/integration validation demonstrates guest progress survives account linking and subsequent login

## CP-32 — Archive Export Contract

### Goal
Define the long-term archive payload before binding it to Google Drive.

### Scope
- archive export envelope/version
- immutable event/archive identity
- pending/synced/error lifecycle
- exported record idempotency key
- compatibility rules for future archive versions
- distinction between gameplay-authoritative D1 state and historical archive

### Exit
- pure serialization tests and compatibility fixtures pass

## CP-33 — appDataFolder Sync + Retry

### Goal
Use Google Drive appDataFolder as the first long-term archive backend without blocking claim gameplay.

### Scope
- adapter around appDataFolder
- export pending archive records
- retry after transient failure
- idempotent duplicate export handling
- mark synced only after confirmed write
- measure payload/storage behavior
- retain short D1 recent-archive buffer

### Exit
- sync failure does not roll back or duplicate already accepted gameplay rewards
- retries converge to one logical archived record

## CP-34 — Persistence / Identity Concurrency

### Goal
Prove the new external boundaries do not weaken M2's exactly-once and optimistic-lock guarantees.

### Required regression cases
- claim while archive sync is pending
- archive retry after response loss
- repeated account-link callback
- concurrent account-link attempts
- linked-account restore while existing guest state exists
- stale snapshot/retry behavior
- M2 claim/equip races remain green

### Exit
- real persistence/integration tests pass for all new race boundaries

## CP-35 — Full M3 Acceptance

### End-to-end target

```text
new guest
→ play accepted M2 loop
→ retain progress
→ link account
→ leave local session
→ restore linked account
→ continue progression
→ create claim/archive record
→ asynchronous archive sync
→ retry-safe persistence
→ continue playing
```

### Acceptance
- automated typecheck/test/build green
- real-D1 acceptance green
- OIDC integration acceptance green
- archive sync/retry acceptance green
- low-bandwidth Web regression remains within accepted guardrails
- manual browser acceptance
- no regression of v0.0.2 M2 loop

## Parallel work, not on M3 CP

May be researched without blocking M3:

- production balance subjective playtesting after CP-28 measurement
- standard ad provider evaluation
- high-risk exploration/lost-equipment design
- Party/Caravan design
- AI cost experiments
- compact-number/UI polish

They should not be merged into M3 implementation solely because they are available.

## Open decisions before accepting this CP

1. Is M3 primarily **identity/archive productionization**, as proposed here?
2. Which OIDC provider should be the first integration target?
3. Is Google appDataFolder still the first long-term archive backend?
4. Should production balance tuning itself be a release blocker, or should CP-28 only establish measured candidate values?
5. Should standard advertising be kept outside M3 or added only after account/archive reliability?

Until these are accepted, this document is a proposal rather than an implementation mandate.
