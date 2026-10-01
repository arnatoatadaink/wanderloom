# ADR-013 — Rarity Resolver Migration Strategy — 2026-10-01

## Status

**Accepted as migration baseline / production behavior unchanged by default**

This ADR defines how Wanderloom moves from the existing `rarityWeightMultipliers` resolver toward the Student's t duration-rarity model introduced by ADR-012.

It does not switch production behavior by itself and does not select a new milestone.

## Context

The current production resolver directly selects an item from all configured drop entries using per-entry weights, optionally modified by `rarityWeightMultipliers` for a duration.

ADR-012 introduced a separate Student's t model in which:

- duration changes the degrees of freedom,
- a shared rarity-threshold model determines rarity opportunity,
- lower tiers remain relatively stable,
- upper-tail rarity opportunity changes smoothly with duration.

The two models have different semantics and must not be swapped in-place without a compatibility boundary.

## Decision

Introduce a strategy facade with two explicit modes:

```text
legacy-weighted
student-t
```

The default is always:

```text
legacy-weighted
```

when no strategy is supplied.

Therefore existing callers preserve their current behavior until they explicitly opt into the Student's t path.

## Resolver flow

### Legacy mode

```text
caller
  -> strategy facade
  -> existing generateSeededRarityDrop(s)
  -> current rarityWeightMultipliers behavior
```

No legacy probability or seeded-selection semantics are intentionally changed.

### Student's t mode

```text
caller
  -> strategy facade
  -> determine configured/reachable rarity tiers
  -> build Student's t rarity distribution
  -> deterministic seeded rarity selection
  -> choose item within selected rarity using existing item weights
```

This separates:

1. rarity-quality selection, and
2. item selection within a rarity tier.

## Initial Student's t parameters

The initial duration defaults remain those from ADR-012:

```text
Short  df = 8
Medium df = 6
Long   df = 5
```

Thresholds default to the current Medium reference thresholds unless a caller supplies another threshold set.

These remain tunable simulation/balance values, not immutable production constants.

## Reachability

Student's t mode must never produce a rarity that:

- has no configured drop entries in the zone, or
- is explicitly excluded by a supplied reachability list.

The effective rarity set is therefore the intersection of:

```text
configured rarities
AND
requested reachable rarities (when provided)
```

The probability distribution is normalized over that effective set.

## Item selection inside a rarity

Once Student's t selects a rarity tier, item selection inside that tier continues to use each item's existing positive `weight`.

This preserves the existing ability to make one item rarer than another within the same rarity tier.

Duration-specific `rarityWeightMultipliers` are not applied in Student's t mode because duration quality is already represented by the t-distribution parameters.

## Determinism

Both modes must remain deterministic for identical inputs.

Student's t mode uses separate deterministic seeded rolls for:

- rarity selection,
- item selection within the selected rarity.

This prevents the rarity-selection step from collapsing item-level weighting into the same random decision.

## Migration phases

### Phase 0 — Current state

- production callers use legacy resolver directly
- Student's t model exists only for simulation/balance analysis

### Phase 1 — Facade available

- add the strategy facade
- default to legacy mode
- add tests for deterministic behavior and reachability
- no production caller migration required

This ADR implements Phase 1.

### Phase 2 — Shadow comparison

Future work:

- call both models for sampled scenarios without changing awarded rewards
- record/compare rarity distributions
- verify zone and duration acceptance ranges
- confirm no unexpected Phantasm/Mythic inflation

### Phase 3 — Explicit opt-in

Future work:

- selected zones or environments explicitly request `student-t`
- retain immediate rollback to `legacy-weighted`
- keep old configuration fields until migration evidence is sufficient

### Phase 4 — Default switch

Only after acceptance evidence:

- make Student's t the default resolver strategy
- preserve legacy strategy for rollback for at least one compatibility window

### Phase 5 — Legacy cleanup

Only after migration is stable:

- remove or deprecate unused `rarityWeightMultipliers`
- simplify duplicated configuration paths

## Non-goals

This ADR does not:

- change existing live/production reward behavior,
- remove `rarityWeightMultipliers`,
- change drop counts,
- change zone content,
- define final production rarity probabilities,
- introduce pity/guarantee mechanics,
- change formation reward logic.

## Acceptance criteria for Phase 1

1. Omitting a strategy produces legacy behavior.
2. Explicit `legacy-weighted` produces legacy behavior.
3. Student's t mode is deterministic for identical inputs.
4. Student's t mode respects duration drop count.
5. Student's t mode cannot produce excluded/unconfigured rarities.
6. Student's t item selection never crosses rarity boundaries.
7. Existing tests remain green.
8. No production caller is silently migrated.

## Rollback

Because the default remains legacy behavior, rollback is trivial during Phase 1:

```text
remove explicit student-t strategy
or
select legacy-weighted
```

No data migration is required.

## Result

The migration architecture becomes:

```text
Production caller
      |
      v
Rarity Resolution Strategy
      |
      +--> legacy-weighted --> existing resolver
      |
      +--> student-t -------> rarity distribution
                              -> rarity selection
                              -> weighted item-in-tier selection
```

This creates a safe path from the existing weighted resolver to the Student's t model without forcing a big-bang production change.
