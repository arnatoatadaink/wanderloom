# ADR-011 — Duration Reward Quality / Rarity Opportunity — 2026-09-29

## Status

**Accepted as L3 reward-structure direction / tunable balance baseline**

This ADR extends ADR-009 and ADR-010.

It does not select M6 scope, create CP-50+, or freeze final production values.

## Context

The current initial balance model evaluates rewards primarily in Gold-equivalent terms. That is useful for visible economic comparison, but it should not force longer expeditions to maximize visible Gold efficiency.

The intended product direction is:

- Short operations are stronger for immediate, visible, repeatable economic throughput.
- Medium operations trade some throughput for broader reward opportunity.
- Long operations may have lower visible Gold efficiency per hour while offering materially better chances to access higher-rarity rewards.

Long-duration play should therefore create a **quality / rarity opportunity premium**, not merely a larger quantity of the same reward.

## Decision

Separate reward evaluation into at least two dimensions:

1. **Visible Economic Reward**
   - Gold,
   - directly fungible / immediately comparable value,
   - net Gold-equivalent throughput,
   - Gold per hour.

2. **Reward Quality / Rarity Opportunity**
   - probability of higher rarity,
   - reachability of upper rarity tiers,
   - expected rarity score,
   - rare-event opportunity per operation.

Do not collapse these into a single Gold-equivalent score for all acceptance decisions.

## Duration direction

For comparable zone / risk / formation conditions:

```text
VisibleGoldEfficiencyPerHour(Short)
  >= VisibleGoldEfficiencyPerHour(Medium)
  >= VisibleGoldEfficiencyPerHour(Long)
```

is an acceptable and potentially preferred default shape.

At the same time:

```text
RarityOpportunity(Short)
  <= RarityOpportunity(Medium)
  <= RarityOpportunity(Long)
```

with Long expected to have a meaningful premium.

The exact inequalities need not be strict for every content configuration, but this is the default balance direction.

## Rarity opportunity parameters

The L3 model should be able to represent at least:

```text
rarityWeightMultiplierByDuration
upperRarityReachabilityByDuration
rareDropChanceMultiplier
rareDropRollCount
rarityFloorModifier
rarityCeilingModifier
expectedRarityScore
```

Not all parameters need to be active in the first implementation.

The preferred initial mechanism is simple:

- keep the zone base rarity table authoritative,
- apply a duration-specific rarity weight multiplier,
- optionally allow longer duration to unlock an upper rarity tier that shorter duration cannot reach,
- keep deterministic seeded resolution.

## Initial qualitative matrix

No final production percentages are fixed yet.

Use this first design matrix:

| Duration | Visible Gold efficiency | Rarity opportunity | Intended role |
|---|---|---|---|
| Short | High | Base | frequent economic runs |
| Medium | Medium | Improved | mixed economy / quality |
| Long | Lower | Highest | rare-item hunting / high-quality opportunity |

## Formation relationship

Duration quality premium is independent from formation-size gross-output scaling.

Formation and duration answer different questions:

- formation controls total operating scale and Operational Cost,
- duration controls time commitment and reward-quality opportunity.

A Caravan must not automatically gain the highest per-participant rare-item efficiency merely because it has the highest total output.

The Solo Competitiveness principle still applies.

Long Solo exploration may therefore be especially competitive for rarity hunting because:

- Solo has near-zero formation Operational Cost,
- Long duration receives the rarity opportunity premium,
- larger formations retain greater total output but pay higher operating cost.

## Simulator metrics

Extend the balance simulator output with reward-quality metrics equivalent to:

```text
visibleGoldReward
visibleNetGoldReward
visibleNetGoldPerHour
expectedDropCount
rarityProbabilityByTier
upperRarityReachable
expectedRarityScore
rareOrBetterProbability
epicOrBetterProbability
legendOrBetterProbability
```

The exact tier aggregations may be adjusted later.

The seven existing rarity tiers remain:

```text
Common
Uncommon
Rare
Epic
Legend
Mythic
Phantasm
```

## Acceptance direction

A candidate duration balance should satisfy both economic and quality checks.

### Visible economy

Long is not required to beat Short or Medium in Gold-per-hour.

A mild decline in visible Gold efficiency as duration increases is acceptable.

### Reward quality

Long must provide a meaningful quality advantage over Short in at least one of:

- expected rarity score,
- Rare-or-better probability,
- upper-rarity reachability,
- number of high-rarity opportunities per completed operation.

A Long expedition that is simply slower and economically worse without a material quality opportunity premium should fail balance review.

### No single-score collapse

Do not mark Long as inferior merely because `Gold/hour` is lower.

Likewise, do not mark Long as superior merely because a hypothetical Gold-equivalent valuation of rare items is higher.

Visible economy and rarity opportunity should remain separately inspectable.

## Initial implementation preference

The first implementation should avoid excessive formula complexity.

Recommended shape:

```text
baseZoneRarityWeights
  × durationRarityMultipliers
  -> effectiveRarityWeights
```

Optionally:

```text
upperRarityReachability(zone, duration)
```

may gate upper tiers.

This should reuse the existing deterministic zone/duration rarity contract rather than introducing a second reward-resolution system.

## Deferred decisions

Not fixed here:

- exact duration values,
- exact rarity multipliers,
- exact per-tier probabilities,
- whether Long unlocks Mythic / Phantasm directly,
- rarity pity systems,
- guaranteed rarity floors,
- Party/Caravan reward distribution,
- item-market Gold valuation,
- final production Gold-per-hour target,
- M6 scope.

## Result

The L3 reward model is now explicitly multi-dimensional:

```text
Duration
  ├─ Visible Economic Throughput
  └─ Reward Quality / Rarity Opportunity
```

Long-duration play is allowed to sacrifice visible Gold efficiency in exchange for materially improved high-rarity opportunity.

This preserves meaningful choice between frequent economic runs and longer rare-item hunting runs without forcing all reward dimensions into one scalar efficiency score.
