# ADR-021: Initial Player Level / EXP Curve

- Date: 2026-10-02
- Status: Proposed for local acceptance
- Layer: L3 progression calibration / L4 content integration

## Context

ADR-020 established absolute EXP rewards for the initial five production zones and three duration classes. The progression contract already supports arbitrary `ProgressionRule` implementations, but no production-candidate level cap or EXP requirement curve existed.

The initial curve needs to satisfy two competing goals:

1. the first level-up should be reachable within a few starter-zone Short expeditions;
2. a high-zone Long expedition should not skip an excessive number of levels from a fresh state.

Zone availability remains controlled by `minimumZoneRank`, not player level. This ADR does not couple zone unlocks to level.

## Decision

Use an initial maximum level of 10 and the following per-level requirement:

```text
EXP required for level L -> L+1 = 30 * L^2
```

This produces:

| Current Level | Next Level | EXP Required | Cumulative EXP from Lv1 |
| ---: | ---: | ---: | ---: |
| 1 | 2 | 30 | 30 |
| 2 | 3 | 120 | 150 |
| 3 | 4 | 270 | 420 |
| 4 | 5 | 480 | 900 |
| 5 | 6 | 750 | 1,650 |
| 6 | 7 | 1,080 | 2,730 |
| 7 | 8 | 1,470 | 4,200 |
| 8 | 9 | 1,920 | 6,120 |
| 9 | 10 | 2,430 | 8,550 |

## Initial progression diagnostics

With the current ADR-018 failure probabilities, ADR-019 50% EXP retention on failure, and ADR-020 EXP rewards:

- Wayfarer Meadow / Short yields 8 generated EXP and about 7.86 expected EXP per run.
- Lv1 -> Lv2 therefore requires about 3.82 expected starter Short runs.
- Starfall Frontier / Long yields 300 generated EXP and 281.25 expected EXP.
- A successful 300 EXP result from Lv1 reaches Lv3 with 150 EXP remaining.
- A failed Starfall Long with 50% retained EXP yields 150 EXP and reaches Lv3 with 0 EXP remaining.
- Therefore the maximum one-run level gain from Lv1 across the initial 15 Zone x Duration scenarios is two levels for both success and failure-retained outcomes.

## Rationale

A linear curve would allow high-zone Long rewards to skip too many early levels. A substantially steeper curve would make the starter experience unnecessarily slow. Quadratic growth provides a simple deterministic baseline that keeps early progression visible while increasing the cost of later levels quickly enough for the current reward table.

The level curve is intentionally independent from:

- `minimumZoneRank` content gating;
- Gold economy;
- rarity reachability;
- formation size;
- Operational Cost;
- future equipment/stat progression.

## Acceptance criteria

1. `maxLevel` is 10.
2. Lv1 -> Lv2 requires 30 EXP.
3. Lv9 -> Lv10 requires 2,430 EXP.
4. Cumulative Lv1 -> Lv10 requirement is 8,550 EXP.
5. Wayfarer Meadow / Short requires between 3.5 and 4.1 expected runs to reach Lv2 from zero EXP.
6. Across the initial 15 Zone x Duration scenarios, one expedition from Lv1 gains no more than two levels on success.
7. The corresponding failure-retained reward also gains no more than two levels from Lv1.
8. Zone gating remains independent from player level.

## Non-goals

This ADR does not:

- define post-Lv10 progression;
- make player level a zone-unlock requirement;
- introduce character stat growth per level;
- change the runtime claim contract;
- enable stochastic failure selection;
- change rarity runtime cutover status.

## Follow-up

After local acceptance, the next progression decision should be whether level grants gameplay power directly or remains primarily a progression/account milestone while equipment and zone rank carry most combat/exploration capability.
