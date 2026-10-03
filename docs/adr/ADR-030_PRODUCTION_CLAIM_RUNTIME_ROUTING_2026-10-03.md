# ADR-030 Production Claim Runtime Routing

Date: 2026-10-03
Status: Proposed

## Context

PR #62 introduced `resolveProductionClaim`, but the default API still used the M2 smoke claim resolver and one global `progressionRule`. Applying production EXP while retaining the M2 progression curve would create an inconsistent runtime model.

## Decision

The default API selects claim behavior per exploration:

- production exploration: `resolveProductionClaim`
- non-production/smoke exploration: existing M2 smoke resolver

Progression rule selection is also per exploration:

- production exploration: `INITIAL_PRODUCTION_PROGRESSION_RULE`
- non-production/smoke exploration: `M2_SMOKE_PROGRESSION_RULE`

`ApiRuntime.resolveProgressionRule` is optional. Custom runtimes that do not provide it keep the previous behavior through `ApiRuntime.progressionRule`.

## Consequences

- production Gold/EXP/failure/LossPolicy and the production level curve are activated atomically
- successful production claims continue to advance Zone Rank through the existing `calculateClaim` contract
- smoke playable-loop behavior remains available as fallback
- production drops remain empty until the dedicated rarity/drop runtime cutover
- `/api/zones` and the Web catalog remain on the smoke catalog until the later UI cutover

## Validation

Focused integration coverage verifies that an exploration-specific progression rule is passed into claim calculation instead of the fallback global rule. Existing workspace regression tests remain authoritative for smoke compatibility.
