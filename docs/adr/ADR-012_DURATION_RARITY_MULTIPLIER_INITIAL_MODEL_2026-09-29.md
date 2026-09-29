# ADR-012 — Initial Duration Rarity Multiplier Model — 2026-09-29

## Status

**Accepted as initial L3 simulation baseline / tunable rarity values**

This ADR extends ADR-011 by defining the first duration-dependent rarity multiplier table for the seven Wanderloom rarity tiers.

It does not select M6 scope, create CP-50+, or freeze production drop rates.

## Goal

Make operation duration affect **reward quality opportunity** rather than only visible Gold-equivalent output.

The intended shape is:

```text
Visible Gold efficiency:
Short >= Medium >= Long

Rarity opportunity:
Short <= Medium <= Long
```

Long operations should therefore trade some visible economic/time efficiency for a meaningfully better chance of upper-rarity rewards.

## Rarity tiers

The existing seven-tier order remains authoritative:

```text
Common
Uncommon
Rare
Epic
Legend
Mythic
Phantasm
```

## Initial duration rarity multipliers

The first simulation baseline uses the following multipliers against each zone's base rarity weights:

| Rarity | Short | Medium | Long |
|---|---:|---:|---:|
| Common | 1.20 | 1.00 | 0.65 |
| Uncommon | 1.10 | 1.00 | 0.85 |
| Rare | 1.00 | 1.00 | 1.20 |
| Epic | 0.80 | 1.00 | 1.60 |
| Legend | 0.50 | 1.00 | 2.20 |
| Mythic | 0.25 | 1.00 | 3.00 |
| Phantasm | 0.10 | 1.00 | 4.00 |

These are **weight multipliers**, not direct probabilities.

They are intentionally asymmetric:

- Short biases toward Common / Uncommon and suppresses upper rarities.
- Medium is the neutral reference profile.
- Long suppresses lower rarities and amplifies upper rarities.

## Calculation model

For a zone with base rarity weights:

```text
zoneBaseWeights[rarity]
```

the duration-adjusted raw weight is:

```text
adjustedWeight[rarity] =
  zoneBaseWeights[rarity]
  * durationRarityMultiplier[durationClass][rarity]
```

The resulting probability distribution is then normalized across all reachable tiers:

```text
probability[rarity] =
  adjustedWeight[rarity]
  / sum(adjustedWeight[all rarities])
```

## Reachability invariant

Duration multiplier does **not** automatically unlock a rarity that the zone explicitly disables.

If:

```text
zoneBaseWeights[Mythic] = 0
```

then:

```text
adjustedWeight[Mythic] = 0
```

for Short, Medium, and Long.

This preserves the existing zone-authority model from CP-22.

If future content wants Long duration to unlock an otherwise unreachable tier, that must be represented as an explicit separate reachability rule rather than by multiplying zero.

## Why Medium is the neutral reference

Medium uses `1.00` across every rarity tier.

This gives balance work a stable comparison point:

```text
Medium distribution == zone base distribution
```

Short and Long therefore express only the intended duration bias rather than redefining the zone itself.

## Expected qualitative effect

Without fixing any production zone distribution, the multipliers guarantee the following directional bias whenever the affected rarity has non-zero base weight:

### Short

- more lower-tier concentration,
- weaker Legend+ opportunity,
- strongest fit for frequent visible-economy farming.

### Medium

- neutral zone rarity profile,
- middle ground between economic efficiency and rarity hunting.

### Long

- lower Common/Uncommon share,
- increased Rare/Epic share,
- materially increased Legend/Mythic/Phantasm opportunity where those tiers are reachable,
- strongest fit for long unattended/high-quality-reward attempts.

## Rarity opportunity metrics

The balance simulator should add at least:

```text
probabilityByRarity[]
rareOrBetterProbability
epicOrBetterProbability
legendOrBetterProbability
mythicOrBetterProbability
phantasmProbability
expectedRarityScore
```

Initial expected-rarity scoring may use simple ordinal simulation weights:

```text
Common   = 0
Uncommon = 1
Rare     = 2
Epic     = 3
Legend   = 4
Mythic   = 5
Phantasm = 6
```

Then:

```text
expectedRarityScore =
  sum(probability[rarity] * rarityScore[rarity])
```

These scores are diagnostic only. They are not item prices or Gold-equivalent valuations.

## Acceptance criteria

For an identical zone/base distribution with at least one reachable upper rarity, the initial model should satisfy:

```text
expectedRarityScore(Short)
  <= expectedRarityScore(Medium)
  <= expectedRarityScore(Long)
```

and normally:

```text
rareOrBetterProbability(Short)
  <= rareOrBetterProbability(Medium)
  <= rareOrBetterProbability(Long)
```

with the same monotonic target for Epic+, Legend+, and other reachable upper-tier thresholds.

Long must not gain its value merely by generating proportionally more total draws. The simulator must report both:

- number of drop opportunities,
- quality distribution per opportunity.

This keeps quantity and rarity-quality effects separately inspectable.

## Formation independence in the initial model

The first rarity multiplier table depends on duration, not Solo/Party/Caravan class.

Thus, under otherwise identical zone and duration rules:

```text
rarityQualityBias(Solo, Long)
== rarityQualityBias(Party, Long)
== rarityQualityBias(Caravan, Long)
```

Formation may still affect total output/drop count through separate rules.

A future design may introduce formation-specific rarity effects, but that is not part of this baseline.

## Parameterized extension boundary

The implementation should consume the table through parameters rather than embedding constants in reward resolution.

Conceptually:

```text
RarityResolutionInput {
  zoneBaseWeights,
  durationClass,
  durationRarityMultipliers,
  reachabilityRules,
  otherModifiers
}
```

Initial strategy:

```text
adjustedWeights =
  zoneBaseWeights * durationRarityMultipliers[durationClass]
```

Future strategy may become:

```text
adjustedWeights = h(
  zone,
  duration,
  risk,
  progression,
  equipment,
  formation,
  modifiers
)
```

without changing the L0/L2 principles.

## Deferred decisions

This ADR does not decide:

- production zone base rarity weights,
- exact item counts per duration,
- whether Long explicitly unlocks upper tiers,
- pity/guarantee mechanics,
- rarity effects from equipment or progression,
- rarity effects from Party/Caravan composition,
- Gold-equivalent valuation of rare drops,
- final real-time Short/Medium/Long durations.

## Result

The initial duration-value model is now two-dimensional:

```text
Duration
  |
  +--> Visible Economic Output / Gold efficiency
  |
  +--> Rarity Quality Bias
           |
           +-- Short  -> lower-tier weighted
           +-- Medium -> neutral zone profile
           +-- Long   -> upper-tier weighted
```

This gives Long operations a distinct strategic purpose without requiring them to beat Short operations on visible Gold-per-hour efficiency.

The next balance action is to test these multipliers against one or more representative zone base distributions and inspect the resulting normalized probabilities and expected-rarity metrics before implementation is selected for a milestone.