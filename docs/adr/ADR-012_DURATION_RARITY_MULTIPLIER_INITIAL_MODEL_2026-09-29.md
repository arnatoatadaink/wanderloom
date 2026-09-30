# ADR-012 — Duration Rarity Student's t Model — 2026-09-29

## Status

**Accepted as revised L3 simulation baseline / tunable rarity-distribution model**

This ADR supersedes the earlier fixed duration-rarity multiplier model and the later chi-square variant in this same document.

It extends ADR-011 by defining a smoother duration-dependent rarity model based on a one-sided Student's t latent quality variable.

It does not select M6 scope, create CP-50+, or freeze production drop rates.

## Goal

Duration should affect **reward quality opportunity** while keeping the lower-rarity distribution comparatively stable.

The intended shape remains:

```text
Visible Gold efficiency:
Short >= Medium >= Long

Rarity opportunity:
Short <= Medium <= Long
```

Long operations should improve upper-tail outcomes without materially reshaping Common/Uncommon/Rare frequencies under ordinary tuning.

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

Use a one-sided Student's t latent quality variable:

```text
T ~ StudentT(nu)
Q = T
```

The same ordered rarity thresholds are applied to `Q` for every duration class.

The Student's t family is symmetric around zero. In this model, only the upper side represents progressively rarer outcomes; negative and ordinary central values naturally fall into lower rarity buckets.

The baseline does **not** use `abs(T)`, because folding both tails would approximately double extreme-tail opportunity and make tuning less intuitive.

Initial degrees of freedom:

| Duration | nu | Role |
|---|---:|---|
| Short | 8 | thinner tail; fewer extreme upper-rarity outcomes |
| Medium | 6 | neutral reference |
| Long | 5 | moderately heavier tail; improved upper-rarity opportunity |

As `nu` decreases, the Student's t distribution develops heavier tails while preserving a stable center. This is the primary reason for preferring it over the prior chi-square model for Wanderloom's rarity-duration relationship.

## Why Student's t replaces chi-square

The normalized chi-square model changed the lower/middle part of the distribution more noticeably when `nu` changed because it is positively skewed.

The desired game behavior is different:

- Common/Uncommon/Rare should remain comparatively stable,
- Epic+ should improve with duration,
- the greatest relative change should appear in Legend/Mythic/Phantasm,
- Phantasm should still remain rare in absolute terms.

Student's t is a better fit because changing `nu` mainly changes tail heaviness while leaving the central region much more stable.

## Rarity thresholds

Rarity is selected by comparing `Q` against ordered thresholds:

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

Using `nu = 6` for Medium, choose Student's t quantile boundaries that reproduce the cumulative probabilities of that reference distribution.

Those threshold values are calibration parameters and are not production commitments.

## Representative effect

When Medium is calibrated to the reference distribution above and the same thresholds are used for all durations, the intended approximate shape is:

| Rarity | Short nu=8 | Medium nu=6 | Long nu=5 |
|---|---:|---:|---:|
| Common | ~55.05% | 55.00% | ~54.96% |
| Uncommon | ~25.37% | 25.00% | ~24.71% |
| Rare | ~12.20% | 12.00% | ~11.84% |
| Epic | ~4.91% | 5.00% | ~5.06% |
| Legend | ~1.78% | 2.00% | ~2.15% |
| Mythic | ~0.59% | 0.80% | ~0.97% |
| Phantasm | ~0.10% | 0.20% | ~0.31% |

These values are illustrative simulation targets rather than acceptance constants.

The important behavior is:

- lower tiers move only slightly,
- Epic changes only slightly,
- progressively rarer tiers receive progressively stronger relative tail benefit,
- Phantasm remains rare in absolute terms,
- no tier receives an arbitrary direct multiplier.

## Interpretation of degrees of freedom

In this model:

```text
larger nu
  -> closer to normal distribution
  -> thinner tail
  -> fewer extreme high-rarity outcomes

smaller nu
  -> heavier tail
  -> more extreme high-rarity outcomes
```

Initial duration parameters:

```text
Short   nu = 8
Medium  nu = 6
Long    nu = 5
```

These are tunable L3 defaults.

A future stronger rarity-focused duration or modifier could use a lower `nu`, but ordinary production tuning should avoid values that make the extreme tail dominate total item value.

## Zone reachability

Zone authority remains explicit.

A zone may mark upper rarities unreachable. Duration must not silently override that decision.

Conceptually:

```text
if rarity not reachable in zone:
    probability = 0
```

Remaining reachable outcomes are resolved under the zone's approved rule.

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
T ~ StudentT(degreesOfFreedom[durationClass])
Q = T
rarity = classify(Q, rarityThresholds)
```

The resolver must consume configuration rather than embedding `8 / 6 / 5` or threshold values directly into reward-resolution code.

Future tuning may adjust:

- degrees of freedom by duration,
- thresholds by zone,
- thresholds by difficulty,
- reachability,
- equipment/progression modifiers,
- score shifts or scale modifiers if later required.

## Extension guidance

Future modifiers should preferably remain mathematically distinct.

Examples:

```text
duration           -> degrees of freedom / tail thickness
zone                -> rarity thresholds / reachability
luck or equipment   -> optional score shift or threshold adjustment
risk                -> optional independent quality modifier
```

This separation avoids overloading `nu` with every rarity-related mechanic.

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
3. Common/Uncommon/Rare probabilities should remain comparatively stable under ordinary `nu` changes.
4. Long must not create an order-of-magnitude increase in Phantasm probability under ordinary tuning.
5. Zone reachability remains authoritative.
6. Drop quantity and per-draw rarity quality remain separately measurable.
7. The baseline uses the one-sided upper tail, not `abs(T)`.

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
- final score-shift or scale-modifier mechanics.

## Result

The revised duration-quality model is:

```text
Duration
  |
  +--> nu (degrees of freedom)
          |
          v
   Student's t draw T
          |
          v
          Q = T
          |
          v
  Shared rarity thresholds
          |
          v
 Common ... Phantasm
```

This replaces both the earlier direct rarity-multiplier table and the chi-square variant.

The resulting design keeps lower-tier probabilities comparatively stable while allowing Long operations to gain a smooth, tunable upper-tail rarity advantage.