# Rarity Shadow Evaluation — 2026-10-01

## Status

Accepted as an evaluation report for the current Student's t candidate model. This document does not switch production rarity resolution away from `legacy-weighted`.

## Scope

The evaluation uses the representative validation profiles added after ADR-013:

- Starter: Common / Uncommon / Rare
- Standard: Common / Uncommon / Rare / Epic / Legend
- Full: all seven rarities

Each profile is evaluated for:

- Short: df = 8
- Medium: df = 6
- Long: df = 5

Each scenario uses 10,000 deterministic seed iterations. The current representative fixture uses the Medium reference probabilities as legacy item weights, then compares that legacy weighted resolver with the Student's t resolver.

These are validation fixtures, not production zone definitions.

## Important interpretation note

`sameRarityRate` is not a primary acceptance metric.

Legacy and Student's t intentionally use different hash namespaces for their rarity rolls. Therefore a low agreement rate does not imply the candidate distribution is wrong. It mostly measures how often two independently-derived deterministic rolls happen to land in the same rarity bucket.

Migration acceptance should prioritize:

1. distribution distance,
2. lower-tier stability,
3. cumulative upper-tail probabilities,
4. expected rarity score,
5. zone reachability invariants.

## 10,000-iteration shadow results

| Profile | Duration | df | Agreement | Expected score delta (Candidate-Legacy) | Approx. total-variation distance |
| --- | --- | ---: | ---: | ---: | ---: |
| Starter | Short | 8 | 44.52% | +0.0093 | 0.73% |
| Starter | Medium | 6 | 46.33% | +0.0125 | 0.86% |
| Starter | Long | 5 | 44.41% | +0.0005 | 0.35% |
| Standard | Short | 8 | 38.79% | +0.0162 | 1.27% |
| Standard | Medium | 6 | 39.24% | +0.0192 | 0.88% |
| Standard | Long | 5 | 39.41% | -0.0112 | 0.72% |
| Full | Short | 8 | 38.24% | +0.0027 | 1.44% |
| Full | Medium | 6 | 38.34% | -0.0172 | 0.92% |
| Full | Long | 5 | 37.45% | +0.0351 | 1.58% |

The observed total-variation distance stays below about 1.6% across all representative scenarios. At 10,000 iterations, the remaining variation is small enough that the candidate is distributionally close to the legacy reference while still expressing the intended duration-tail behavior.

## Starter profile

### Short

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 59.82% | 59.09% |
| Uncommon | 27.21% | 27.74% |
| Rare | 12.97% | 13.17% |

### Medium

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 61.11% | 60.25% |
| Uncommon | 26.47% | 26.94% |
| Rare | 12.42% | 12.81% |

### Long

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 59.54% | 59.69% |
| Uncommon | 27.52% | 27.17% |
| Rare | 12.94% | 13.14% |

### Interpretation

The Starter profile is very stable. Restricting reachability to Common-Rare causes the Student's t probabilities to renormalize inside the reachable set, and the candidate remains within roughly one percentage point per tier in these runs.

This supports using the same Student's t mechanism for early zones without artificially leaking inaccessible high rarities.

## Standard profile

### Short

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 56.28% | 55.06% |
| Uncommon | 24.97% | 25.87% |
| Rare | 11.98% | 12.17% |
| Epic | 5.00% | 5.18% |
| Legend | 1.77% | 1.72% |

### Medium

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 56.24% | 55.36% |
| Uncommon | 24.97% | 25.26% |
| Rare | 11.92% | 12.18% |
| Epic | 4.94% | 5.15% |
| Legend | 1.93% | 2.05% |

### Long

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 55.68% | 55.92% |
| Uncommon | 24.85% | 25.31% |
| Rare | 12.23% | 11.73% |
| Epic | 5.10% | 4.88% |
| Legend | 2.14% | 2.16% |

### Interpretation

The Standard profile remains close to the reference. Long increases the extreme tail only up to the zone's reachable ceiling, so the heavier tail mostly accumulates into Legend rather than leaking into Mythic/Phantasm.

This is consistent with the intended rule that Zone reachability remains authoritative.

## Full profile

### Short

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 55.61% | 54.85% |
| Uncommon | 25.15% | 25.10% |
| Rare | 11.36% | 12.54% |
| Epic | 4.86% | 5.12% |
| Legend | 2.12% | 1.73% |
| Mythic | 0.80% | 0.62% |
| Phantasm | 0.10% | 0.04% |

### Medium

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 55.06% | 55.77% |
| Uncommon | 24.97% | 24.39% |
| Rare | 11.89% | 12.10% |
| Epic | 4.97% | 4.90% |
| Legend | 1.98% | 1.95% |
| Mythic | 0.91% | 0.70% |
| Phantasm | 0.22% | 0.19% |

### Long

| Rarity | Legacy | Student's t |
| --- | ---: | ---: |
| Common | 54.80% | 54.67% |
| Uncommon | 25.59% | 24.14% |
| Rare | 11.66% | 12.19% |
| Epic | 4.79% | 5.36% |
| Legend | 2.14% | 2.44% |
| Mythic | 0.85% | 0.94% |
| Phantasm | 0.17% | 0.26% |

Candidate cumulative upper-tail probabilities in the Full profile were approximately:

| Duration | Epic+ | Legend+ | Phantasm |
| --- | ---: | ---: | ---: |
| Short | 7.51% | 2.39% | 0.04% |
| Medium | 7.74% | 2.84% | 0.19% |
| Long | 9.00% | 3.64% | 0.26% |

The 10,000-iteration empirical Short Phantasm count is especially noisy because the expected rate is very small. The acceptance decision should therefore not overfit individual rare-tail counts from one 10,000-sample run.

## Decision on df = 8 / 6 / 5

### Decision

**Retain Short=8, Medium=6, Long=5 as the current initial Student's t candidate baseline.**

The reasons are:

1. Lower-tier distributions stay close to the legacy reference.
2. Zone reachability remains authoritative under renormalization.
3. Long produces a visible but not extreme increase in the far upper tail.
4. The candidate avoids the earlier direct multiplier behavior that produced excessive Phantasm growth.
5. The empirical distribution distance remains small across Starter, Standard, and Full profiles.

### What is not yet approved

This does **not** approve switching production output to Student's t yet.

Production remains `legacy-weighted` until the migration gates below are completed.

## Recommended migration gates before production switch

1. Add explicit distribution-distance metrics to the shadow report:
   - total variation distance,
   - maximum absolute tier delta,
   - cumulative Rare+/Epic+/Legend+/Mythic+ deltas.
2. Increase validation sample size for upper-tail review:
   - at least 100,000 iterations for Full profile,
   - preferably 1,000,000 for Phantasm-specific stability checks.
3. Define actual production ZoneRewardConfiguration data.
4. Re-run shadow evaluation against those actual zone definitions.
5. Define acceptable per-zone deviation thresholds.
6. Only then enable `student-t` for a controlled production scope.

## Current recommendation

Proceed with `df=8/6/5` unchanged into the next validation phase, but keep `legacy-weighted` as the production-authoritative resolver.

The next engineering task should extend the shadow comparison report with distribution-distance and cumulative-tail acceptance metrics, then rerun the Full profile at a larger deterministic sample size.
