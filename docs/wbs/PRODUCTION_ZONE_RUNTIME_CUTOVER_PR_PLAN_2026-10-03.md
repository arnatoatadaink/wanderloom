# Production Zone Runtime Cutover PR Plan — 2026-10-03

Status: Proposed execution plan

## Goal

Move the playable loop from the legacy M2 smoke-zone runtime to the production Zone model without making one high-risk all-at-once change.

Each PR must be independently mergeable to `main`, locally testable, and must not break the existing playable loop before the final cutover.

## Dependency chain

```text
PR59 Production Zone Catalog
  -> PR60 Production Zone Preview + /api/zones contract
    -> PR61 Production Expedition Resolution
      -> PR62 Production Rarity / Drop Runtime
        -> PR63 Web + Full Playable-loop Cutover
```

## PR59 — Production Zone Catalog

Purpose: establish one runtime-facing source for production Zone and duration identity before switching any endpoint.

Scope:
- map `INITIAL_PRODUCTION_ZONE_CONTENT_MAP` into a runtime catalog
- define canonical duration IDs and elapsed times
  - `short` = 30 minutes
  - `medium` = 2 hours
  - `long` = 8 hours
- expose `minimumZoneRank` and derived `unlocked`
- keep `/api/zones`, duration resolution, rewards and claim behavior unchanged

Acceptance:
- all 5 production Zones appear in stable order
- Rank 0 unlocks only Wayfarer Meadow
- Rank 2 unlocks Wayfarer, Mossglass and Shattered Causeway
- all three canonical durations exist for every Zone
- no existing smoke runtime behavior changes

## PR60 — Production Zone Preview + API Contract

Purpose: make `/api/zones` capable of returning production Zone metadata and authoritative availability without yet switching claim resolution.

Scope:
- adapt production catalog to API `ZoneDto`
- add `minimumZoneRank` / `unlocked`
- derive Gold/EXP/Risk preview from accepted production calibration
- expose production duration IDs
- introduce an explicit runtime/catalog mode seam if necessary so the endpoint can be tested without silently changing claim resolution

Acceptance:
- Rank-aware zone response is deterministic
- preview values agree with production calibration functions
- locked Zones remain visible but marked unavailable
- no client-side invention of access state

## PR61 — Production Expedition Resolution

Purpose: replace the M2 fixed 25% failure / smoke reward resolution with production risk, Gold, EXP and LossPolicy.

Scope:
- resolve `riskIndex × durationClass` failure probability
- use accepted production LossPolicy
- use production EXP table
- use production Solo Gold baseline for the current solo playable loop
- preserve seeded deterministic resolution
- use the production Player progression rule

Acceptance:
- generated/retained Gold and EXP match production model
- failure probability matches ADR-018 calibration
- failure retention matches ADR-019
- Player Level progression uses ADR-021 curve
- Zone Rank progression still updates only on successful current-rank Zone completion

## PR62 — Production Rarity / Drop Runtime

Purpose: move actual runtime drops from M2 smoke reward tables to the accepted production rarity model.

Scope:
- use production Zone rarity tier
- use Short/Medium/Long Student-t calibrated probability tables
- preserve seeded deterministic lookup
- retain reachable-tier restrictions per Zone
- apply failure drop loss through production LossPolicy
- remove M2 smoke drop tables from the production path while keeping regression fixtures where useful

Acceptance:
- runtime rarity distribution is based on accepted production calibration
- unreachable tiers cannot drop
- same seed + same inputs remains reproducible
- failed expedition drops are lost under current LossPolicy

## PR63 — Web + Full Playable-loop Cutover

Purpose: make the production Zone progression the actual user-facing loop.

Scope:
- switch `/api/zones` and duration resolution to production catalog
- Web displays locked/unlocked state and Rank requirement
- locked cards are disabled
- claim completion refreshes Zone availability
- verify `Wayfarer success -> Mossglass unlocked -> Mossglass start allowed`
- retain API-side `zone_locked` as authority even if UI is stale or bypassed
- update smoke/integration acceptance tests to production loop

Acceptance:
- new/legacy Rank-0 player can start Wayfarer only
- successful Wayfarer claim persists Rank 1
- refreshed UI shows Mossglass unlocked
- Mossglass start succeeds after unlock
- direct pre-unlock Mossglass start returns HTTP 403 `zone_locked`
- all workspace typechecks and tests pass

## Deliberate non-goals for this PR group

- Party / Caravan runtime party construction
- stamina runtime
- post-Level-10 progression
- Level-to-Zone coupling
- direct Player Level combat-stat scaling
- real staging or production deployment

## Merge rule

Do not start a dependent cutover PR from assumptions that have not been accepted in its predecessor. Local acceptance remains the gate before each PR is merged to `main`.
