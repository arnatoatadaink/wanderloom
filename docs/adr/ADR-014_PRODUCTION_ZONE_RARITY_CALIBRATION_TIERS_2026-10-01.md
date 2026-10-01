# ADR-014 Production Zone Rarity Calibration Tiers

Date: 2026-10-01
Status: Accepted initial L3 calibration baseline

## Context

The Student's t duration rarity model has passed representative-zone shadow validation and Full-profile 100,000-iteration validation with the accepted duration degrees of freedom Short=8, Medium=6, Long=5.

The repository does not yet contain authoritative production content-zone definitions. Naming concrete production zones now would prematurely freeze L4 content decisions. The next required step is therefore to define the L3 rarity reachability contract that future production zones will map onto.

## Decision

Define three production rarity calibration tiers independent from concrete zone names.

| Tier | Reachable rarities |
| --- | --- |
| Tier1 | Common, Uncommon, Rare |
| Tier2 | Common, Uncommon, Rare, Epic, Legend |
| Tier3 | Common, Uncommon, Rare, Epic, Legend, Mythic, Phantasm |

The tier controls reachability. Duration controls Student's t tail thickness.

Initial duration model:

- Short: df=8
- Medium: df=6
- Long: df=5

All three tiers initially share the accepted Medium-reference threshold set from ADR-012. This deliberately separates two dimensions:

- Zone tier -> which rarity bands may be reached
- Duration -> how much probability mass moves into the upper tail among reachable bands

## Invariants

1. Duration must not unlock a rarity that the zone tier does not permit.
2. Tier reachability is monotonic: Tier1 is a subset of Tier2, and Tier2 is a subset of Tier3.
3. Mythic and Phantasm remain inaccessible outside Tier3 in this baseline.
4. Short / Medium / Long use the accepted df=8 / 6 / 5 model unless a later calibration ADR supersedes it.
5. Concrete production zone names remain an L4 content decision and are not fixed by this ADR.
6. Production runtime remains legacy-weighted until a separate cutover decision is accepted.

## Why shared thresholds initially

The current evidence supports the duration model itself. There is not yet production content evidence sufficient to justify separate threshold sets per zone tier. Starting with one threshold set makes reachability the only zone-controlled variable and keeps calibration interpretable.

If later playtesting shows that a specific content tier needs a materially different rarity mix, a future ADR may introduce tier-specific thresholds or score shifts. Such changes must retain deterministic seeded resolution and must be validated with the existing shadow-distance metrics.

## Runtime integration boundary

`production-zone-rarity-calibration.ts` provides a strategy builder that returns a Student's t rarity strategy for a tier and duration class. It does not switch any production caller to Student's t.

A later content mapping layer may map concrete zones to Tier1/Tier2/Tier3. A later cutover layer may then select Student's t for validated production callers.

## Acceptance

This ADR is accepted as the initial L3 production-zone calibration baseline, not as production cutover authorization.
