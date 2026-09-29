# ADR-012 — Duration Rarity Chi-Square Model — 2026-09-29

## Status

**Accepted as revised L3 simulation baseline / tunable rarity-distribution model**

This ADR supersedes the earlier fixed duration-rarity multiplier table in this same document.

It extends ADR-011 by defining a smoother duration-dependent rarity model based on a normalized chi-square distribution rather than direct per-tier multipliers such as `Phantasm x4.00`.

It does not select M6 scope, create CP-50+, or freeze production drop rates.

## Goal

Duration should affect **reward quality opportunity** while preserving a smooth rarity tail.

The intended shape remains:

```text
Visible Gold efficiency:
Short >= Medium >= Long

Rarity opportunity:
Short <= Medium <= Long
```

Long operations should improve the probability of upper-rarity outcomes, but should not create abrupt tier-specific jumps.

## Rarity tiers

The seven-tier order remains:

```text
Common
Uncommon
Rare
Epic
Legend
Mythic
Phantasm
```

## Distribution model

Use a normalized chi-square latent quality variable:

```text
X ~ ChiSquare(nu)
Q = X / nu
```

`Q` has mean 1 for every duration class. Changing `nu` changes the spread/skew of the distribution rather than directly multiplying a named rarity tier.

Initial degrees of freedom:

| Duration | nu | Role |
|---|---:|---|
| Short | 8 | tighter distribution; fewer extreme upper-tail outcomes |
| Medium | 6 | neutral reference |
| Long | 5 | moderately heavier right tail; improved high-rarity opportunity |

The difference is intentionally small. Long should improve the tail, not radically reshape the economy.

## Rarity thresholds

Rarity is selected by comparing `Q` against ordered rarity thresholds:

```text
qCommonMax
qUncommonMax
qRareMax
qEpicMax
qLegendMax
qMythicMax
```

Conceptually:

```text
Q < qCommonMax                    -> Common
Q < qUncommonMax                  -> Uncommon
Q < qRareMax                      -> Rare
Q < qEpicMax                      -> Epic
Q < qLegendMax                    -> Legend
Q < qMythicMax                    -> Mythic
otherwise                         -> Phantasm
```

Thresholds are zone/balance parameters. They must not be embedded as magic constants in the resolver.

## Medium calibration reference

For simulation only, a representative Medium distribution may be calibrated to:

| Rarity | Medium reference probability |
|---|---:|
| Common | 55.0% |
| Uncommon | 25.0% |
| Rare | 12.0% |
| Epic | 5.0% |
| Legend | 2.0% |
| Mythic | 0.8% |
| Phantasm | 0.2% |

Using `nu = 6` for Medium and choosing thresholds to reproduce that reference distribution gives approximate normalized `Q` boundaries:

```text
Common / Uncommon : 0.9609
Uncommon / Rare   : 1.4263
Rare / Epic       : 1.8806
Epic / Legend     : 2.3279
Legend / Mythic   : 2.8020
Mythic / Phantasm : 3.4652
```

These are simulation calibration values, not production commitments.

## Example resulting distributions

Using the same thresholds for each duration class gives approximately:

| Rarity | Short nu=8 | Medium nu=6 | Long nu=5 |
|---|---:|---:|---:|
| Common | 53.54% | 55.00% | 55.98% |
| Uncommon | 28.51% | 25.00% | 22.92% |
| Rare | 12.12% | 12.00% | 11.70% |
| Epic | 4.13% | 5.00% | 5.40% |
| Legend | 1.28% | 2.00% | 2.45% |
| Mythic | 0.37% | 0.80% | 1.16% |
| Phantasm | 0.05% | 0.20% | 0.39% |

This is the intended qualitative behavior:

- Short suppresses the extreme upper tail.
- Medium is the neutral reference.
- Long improves Epic+ and especially Legend/Mythic/Phantasm opportunity.
- Phantasm rises gradually in absolute probability rather than receiving a direct `x4` multiplier.

The exact probability ratios are not acceptance requirements; the smooth-tail shape is.

## Important interpretation

A lower `nu` in this normalized model creates a more right-skewed distribution.

That does **not** mean every upper tier rises equally. Probability mass is redistributed continuously according to the common thresholds.

This is preferable to independent rarity multipliers because adjacent tiers remain mathematically related and there is no arbitrary discontinuity such as:

```text
Mythic x3
Phantasm x4
```

## Zone reachability

Zone authority remains explicit.

A zone may still mark upper rarities unreachable. Duration must not silently override that decision.

Conceptually:

```text
if rarity not reachable in zone:
    probability = 0
```

The remaining reachable probabilities are then renormalized.

Therefore Long does not automatically unlock Mythic or Phantasm.

If Long-specific unlocking is desired later, it must be represented by a separate reachability rule.

## Parameterized calculation boundary

The implementation should accept parameters equivalent to:

```text
RarityDistributionInput {
  zoneId
  durationClass
  degreesOfFreedom
  rarityThresholds
  reachabilityRules
  otherModifiers
}
```

Initial calculation:

```text
X ~ ChiSquare(degreesOfFreedom[durationClass])
Q = X / degreesOfFreedom[durationClass]
rarity = classify(Q, rarityThresholds)
```

Future tuning may adjust:

- degrees of freedom by duration,
- thresholds by zone,
- thresholds by difficulty,
- reachability,
- equipment/progression modifiers,
- additional distribution parameters if chi-square alone becomes insufficient.

The initial implementation should keep these values external to the resolver.

## Simulator metrics

The balance simulator should report at least:

```text
probabilityByRarity[]
rareOrBetterProbability
epicOrBetterProbability
legendOrBetterProbability
mythicOrBetterProbability
phantasmProbability
expectedRarityScore
```

Using diagnostic ordinal scores:

```text
Common   = 0
Uncommon = 1
Rare     = 2
Epic     = 3
Legend   = 4
Mythic   = 5
Phantasm = 6
```

Gold valuation remains separate.

## Acceptance criteria

For representative zones with reachable upper rarities, the model should normally satisfy:

```text
ExpectedRarityScore(Short)
  <= ExpectedRarityScore(Medium)
  <= ExpectedRarityScore(Long)
```

and the same monotonic direction for important upper-tail metrics such as:

```text
Epic+
Legend+
Mythic+
Phantasm
```

Additional constraints:

1. No individual upper tier receives an independent duration multiplier in the baseline model.
2. Duration effects should remain smooth under small changes to `nu`.
3. Long must not create an order-of-magnitude increase in Phantasm probability under ordinary tuning.
4. Zone reachability remains authoritative.
5. Drop quantity and per-draw rarity quality remain separately measurable.

## Formation independence

The initial rarity-quality distribution depends on duration, not formation class.

For otherwise identical zone rules:

```text
rarityDistribution(Solo, Long)
== rarityDistribution(Party, Long)
== rarityDistribution(Caravan, Long)
```

Formation may affect total drop count through separate rules.

## Deferred decisions

This ADR does not decide:

- production zone rarity thresholds,
- production Medium base distribution,
- final Short/Medium/Long duration values,
- whether Long explicitly unlocks upper tiers,
- pity/guarantee mechanics,
- exact drop counts,
- item-specific rarity tables,
- Gold-equivalent valuation of rare drops,
- rarity effects from formation/equipment/progression,
- whether a different statistical family replaces chi-square after simulation testing.

## Result

The revised duration-quality model is:

```text
Duration
  |
  +--> nu (degrees of freedom)
          |
          v
   Chi-square draw X
          |
          v
      Q = X / nu
          |
          v
  Shared rarity thresholds
          |
          v
 Common ... Phantasm
```

This replaces the earlier direct rarity-multiplier table and gives Long operations a smoother, tunable upper-tail advantage.