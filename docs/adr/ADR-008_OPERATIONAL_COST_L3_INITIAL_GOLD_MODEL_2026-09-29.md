# ADR-008 — L3 Initial Operational Cost Gold Model — 2026-09-29

## Status

**Accepted as initial L3 simulation baseline / tunable balance values**

This ADR refines `ADR-006` and `ADR-007` by selecting a simple economic mapping for the first Operational Cost simulations.

It does not select M6 scope, create CP-50+, or declare these values final production balance.

## Decision summary

For the first L3 model:

- Operational Cost is denominated directly in **Gold-equivalent units**.
- `1 cost unit = 1 Gold` for calculation and simulation.
- Solo formation overhead is `0 Gold`.
- Party and Caravan costs use simple formation classes and duration multipliers.
- Cost reduction applies to the operational-cost subtotal and moves the cost toward zero.
- Travel/content-specific fees remain additive and separate from formation overhead.
- The first model deliberately avoids Social Stress, complex logistics inventories, multiple currencies, durability, and nonlinear formulas.
- All members inside the same initial formation class share the same formation cost: Party 2–4 are equal-cost, and Caravan 5–12 are equal-cost.
- The calculation boundary must remain parameterized so future models can replace the simple lookup/multiplication rule with a richer formula without changing the surrounding exploration contract.

The purpose is to obtain a transparent baseline that can be simulated and later replaced by richer rules if needed.

## Formation classes

Initial semantic size bands:

| Formation | Participants | Intended role |
|---|---:|---|
| Solo | 1 | lowest overhead, longest sustainable activity |
| Party | 2–4 | intermediate output and operating cost |
| Caravan | 5–12 | high gross output, high operating cost |

These limits are initial balance boundaries, not networking/matchmaking implementation limits.

A future milestone may split Caravan into additional tiers without changing the L0 principle.

## Duration classes

Initial duration buckets:

| Duration class | Real elapsed time | Duration multiplier |
|---|---:|---:|
| Short | 30 minutes | 1 |
| Medium | 2 hours | 3 |
| Long | 8 hours | 8 |

The multiplier is intentionally not equal to elapsed-time ratio. These values are simulation defaults only; gameplay tempo remains a later design decision and may be aligned with actual exploration duration IDs.

## Base formation cost

Initial formation overhead per operation:

| Formation | Base formation cost |
|---|---:|
| Solo | 0 Gold |
| Party | 1 Gold |
| Caravan | 4 Gold |

This keeps the qualitative invariant:

```text
Solo << Party < Caravan
```

while preserving a very small absolute scale for early testing.

## Initial 3 x 3 cost matrix

Before reductions and route-specific Travel Cost:

| Formation | Short (x1) | Medium (x3) | Long (x8) |
|---|---:|---:|---:|
| Solo | 0 G | 0 G | 0 G |
| Party | 1 G | 3 G | 8 G |
| Caravan | 4 G | 12 G | 32 G |

This is the first reference matrix for balance simulations.

The matrix models **formation operating overhead only**. A destination may still charge Travel Cost to Solo, Party, or Caravan separately.

## Participant-count simplification

The initial model intentionally does not charge each additional participant individually.

```text
Party(2) == Party(3) == Party(4)
Caravan(5) == Caravan(6) == ... == Caravan(12)
```

In particular, a 5-member Caravan and a 12-member Caravan have the same formation-operating cost in this first model.

This is an explicit simplicity choice rather than an assumption that real operating cost is independent of size. If later simulation or gameplay requires finer granularity, participant count becomes one of the inputs to a replacement cost function.

## Parameterized calculation boundary

Even though the first model is a simple class lookup, implementation should expose the calculation as a parameter-driven function rather than embedding the current table directly throughout gameplay code.

Conceptual input:

```text
OperationalCostInput {
  formationClass,
  participantCount,
  durationClass,
  durationValue,
  formationBaseCost,
  durationMultiplier,
  coordinationParameter,
  logisticsParameter,
  travelCost,
  explicitContentCost,
  operationalCostReduction,
  sourceSpecificReductions,
  otherModifiers
}
```

Not every field affects the initial formula. Unused future-facing inputs may remain absent from the first implementation, but the calculation boundary must permit them to be introduced without redefining Operational Cost itself.

The initial strategy can be expressed as:

```text
formationOperationalCost =
  baseFormationCost(formationClass)
  * durationMultiplier(durationClass)
```

A future strategy may instead evaluate a function such as:

```text
formationOperationalCost = f(
  formationClass,
  participantCount,
  duration,
  coordination,
  logistics,
  route,
  formationState,
  modifiers
)
```

The exact future formula is intentionally not fixed. The requirement is that balance parameters remain data/configuration inputs to one calculation boundary rather than becoming scattered constants.

Travel/content cost remains separate:

```text
baseGoldRequirement =
  formationOperationalCost
  + travelCost
  + explicitContentCost
```

For the initial model, Logistics and Coordination are represented implicitly inside `baseFormationCost` rather than charged as separate Gold lines.

They must remain conceptually inspectable in future expansions, as required by ADR-007.

## Cost reduction

The first reduction rule is deliberately simple:

```text
effectiveOperationalCost =
  max(0, formationOperationalCost * (1 - operationalCostReduction))
```

and then:

```text
finalGoldRequirement =
  effectiveOperationalCost
  + travelCost
  + explicitContentCost
```

Initial rules:

- `operationalCostReduction` range: `0.0 .. 1.0`
- reductions stack additively before one clamp in the initial simulation model,
- the sum is clamped to `1.0`,
- exactly zero formation operational cost is allowed,
- Travel Cost and explicit content costs are **not** automatically reduced by generic operational-cost reduction,
- source-specific reduction can be added later.

Example:

```text
Party / Long
base formation cost = 1
Duration multiplier = 8
formationOperationalCost = 8 G
operationalCostReduction = 25%

effectiveOperationalCost = 6 G
```

A Caravan / Long operation begins at `32 G`; a 50% operational reduction makes it `16 G` before Travel/content costs.

## Why Solo remains at zero formation cost

ADR-006 establishes Solo competitiveness primarily through low operating overhead.

The initial model therefore keeps Solo formation overhead at exactly zero instead of introducing an artificial minimum cost.

Solo may still pay:

- Travel Cost,
- content entry cost,
- stamina or other systems if separately introduced,
- risk/failure consequences.

Thus `Solo operational formation cost = 0` does not imply `every Solo action is free`.

## Reward boundary

This ADR does not fix formation reward multipliers.

For simulation, reward calculation must remain separate from cost calculation:

```text
NetGoldEquivalent = GrossGoldEquivalent - FinalGoldRequirement
```

The next L3 balance step defines initial gross-reward multipliers for Solo / Party / Caravan and Short / Medium / Long, then compares:

- gross reward,
- net reward,
- reward per participant,
- reward per Gold consumed,
- reward per hour,
- sustainable repetitions.

The L0 constraint remains: larger formations may have greater gross output but should not dominate Solo in net efficiency across substantially all durations.

## Deferred parameters

Not fixed by this initial model:

- exact Party reward split,
- Caravan reward distribution,
- per-member operating surcharge,
- nonlinear size curve,
- source-specific Logistics Gold cost,
- source-specific Coordination Gold cost,
- Social Stress,
- stress recovery,
- durability/supply resources,
- multiple payment currencies,
- production reward multipliers,
- production EXP/drop balance.

## Tuning status

The following numbers are explicitly **tunable initial defaults**, not immutable product invariants:

- Party size `2–4`,
- Caravan size `5–12`,
- Short `30m`, Medium `2h`, Long `8h`,
- duration multipliers `1 / 3 / 8`,
- Party base cost `1 G`,
- Caravan base cost `4 G`.

Changing these values later does not supersede ADR-006 or ADR-007 provided their qualitative invariants remain intact.

## Result

L3 now has a minimal executable and extensible economic model:

```text
Formation/Duration Parameters
      ↓
Operational Cost Calculation Strategy
      ↓
Formation Operational Cost (Gold)
      ↓
Operational Cost Reduction
      ↓
Effective Formation Cost
      +
Travel / Content Cost
      ↓
Final Gold Requirement
```

The next design action is to define the initial **Gross Reward scaling matrix** so the balance simulator can compare Solo / Party / Caravan net efficiency across Short / Medium / Long operations.
