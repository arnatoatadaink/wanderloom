# ADR-007 — L2 Operational Cost System — 2026-09-28

## Status

**Accepted / L2 core-system design baseline**

This ADR refines the accepted L0 principle in `ADR-006_SOLO_COMPETITIVENESS_LOW_OPERATIONAL_COST_2026-09-28.md` without assigning M6 scope or CP-50+ work.

## Context

ADR-006 fixes the product invariant:

> **Solo Competitiveness = Low Operational Cost.**

Wanderloom therefore needs one formation-neutral core system that can represent the cost of operating Solo, Party, and Caravan formations without hard-coding production balance values or prematurely selecting the resource that pays the cost.

The system must also support the intended scale/duration relationship:

- larger formations can produce higher gross output,
- larger formations cost more to operate,
- larger formations become harder to sustain for long durations,
- solo remains naturally efficient because its operational overhead is near zero.

## Decision

Introduce a single L2 **Operational Cost System** above Party-, Caravan-, and content-specific mechanics.

Conceptually:

```text
Formation + Operation Context
          |
          v
Operational Cost Sources
  ├─ Formation Size
  ├─ Coordination / Social
  ├─ Logistics
  ├─ Travel
  └─ Duration
          |
          v
   Base Cost Requirement
          |
          v
 Cost Reduction / Modifiers
          |
          v
 Effective Cost Requirement
          |
          v
 L3 resource/payment mapping
```

The L2 system computes a **cost requirement**. It does not decide which economic resource ultimately satisfies that requirement.

## Formation model

The system recognizes three semantic formation classes.

### Solo

- one independently operated participant/character,
- no group-coordination requirement,
- formation overhead is zero or approximately zero,
- may still incur route/content-specific costs such as travel if later rules require them,
- intended to have the lowest cost growth with duration.

### Party

- coordinated small-group operation,
- incurs formation and coordination overhead,
- sits between Solo and Caravan in expected cost and sustainable duration,
- exact participant limits are not fixed here.

### Caravan

- large-scale coordinated operation,
- incurs the largest formation/logistics/coordination overhead,
- may achieve the greatest gross output,
- is expected to be relatively expensive to sustain over long durations,
- exact participant limits and internal topology are not fixed here.

The system is deliberately semantic rather than numeric. Exact size boundaries belong to later rules.

## Cost-source model

Operational cost is composed from independently inspectable sources.

### 1. Formation Size Cost

Represents overhead created by operating a formation at a given scale.

Expected qualitative ordering:

```text
Solo << Party < Caravan
```

### 2. Coordination / Social Cost

Represents coordination overhead created by multiple participants, roles, or agents operating together.

This is the operational-cost interpretation of the earlier social-cost concept.

It is **not** automatically identical to `Social Stress`.

### 3. Logistics Cost

Represents support overhead created by moving, supplying, maintaining, or organizing a formation.

It may become particularly important for Caravan-scale activity.

### 4. Travel Cost

Represents operation-specific movement/access cost.

Travel cost may exist even for Solo play. Group scale may later amplify it through logistics rules, but that function is not fixed here.

### 5. Duration Cost

Represents the cost of sustaining an operation over time.

Duration is a first-class input to operational cost rather than only a reward multiplier.

## Duration and scale invariant

L2 fixes the qualitative dependency but not its numeric curve.

For comparable content and conditions:

```text
CostGrowthWithDuration(Solo)
  <= CostGrowthWithDuration(Party)
  <= CostGrowthWithDuration(Caravan)
```

and normally:

```text
OperationalCost(Solo, d)
  < OperationalCost(Party, d)
  < OperationalCost(Caravan, d)
```

for a common meaningful duration `d`.

Exceptions may be introduced by explicit content rules or specialization, but must not destroy the L0 Solo-competitiveness principle globally.

This produces the intended strategic space:

```text
Solo      -> low overhead / long sustainable operation
Party     -> intermediate output / cost / duration
Caravan   -> high gross output / high overhead / shorter efficient operation
```

## Core calculation boundary

L2 should expose a calculation in three conceptual stages.

### Stage A — Source evaluation

Derive component requirements from immutable operation inputs.

Illustrative shape:

```text
OperationalCostSources {
  formationSize
  coordination
  logistics
  travel
  duration
}
```

The representation may change during implementation; the requirement is that cost sources remain distinguishable for inspection, balancing, and simulation.

### Stage B — Base requirement

Combine the source requirements into a normalized non-negative base requirement.

```text
baseRequirement >= 0
```

No final aggregation formula is fixed at L2.

### Stage C — Reduction / modifiers

Apply valid cost-reduction effects and produce an effective requirement.

Required invariants:

```text
effectiveRequirement >= 0
```

and, absent an explicit cost-increasing modifier:

```text
effectiveRequirement <= baseRequirement
```

Whether reductions stack additively, multiplicatively, by category, or with diminishing returns belongs to L3.

## Cost reduction as a gameplay hook

Cost reduction is an intentional extension point rather than a special-case bonus.

Later systems/content may reduce one or more operational-cost sources through:

- equipment,
- character traits,
- formation composition,
- facilities,
- consumables,
- route knowledge,
- progression unlocks,
- other approved mechanics.

A reduction may target a specific source instead of total cost. For example, an item may reduce Travel Cost without affecting Coordination Cost.

This gives Solo, Party, and Caravan different specialization paths while retaining one common cost system.

## Social Stress relationship

`Social Stress` remains a separate potential gameplay state.

L2 fixes the following separation:

```text
Operational Cost != Social Stress
```

If Social Stress is later implemented, approved relationships may include:

```text
high coordination load -> Social Stress accumulation
Social Stress          -> coordination-efficiency modifier
Social Stress          -> risk / recovery / duration consequence
```

but none of those mappings are automatic or fixed by this ADR.

This prevents a hidden psychological/social state from becoming indistinguishable from an explicit resource/payment requirement.

## Travel and logistics relationship

Travel and Logistics remain separate sources because they answer different questions:

- **Travel Cost:** what does this route/destination/operation require?
- **Logistics Cost:** what additional overhead is created by operating this formation at that route/duration?

This allows, for example, a costly destination to remain costly for Solo while a Caravan additionally pays scale-dependent logistics overhead.

## Reward-system boundary

Operational Cost does not replace reward calculation.

The high-level economic relationship is:

```text
Gross Output
     |
     +-- operational requirement / consumed resources
     v
Net Efficiency
```

L2 must keep gross reward and operational cost separately measurable so the balance simulator can compare:

- gross reward,
- effective operational cost,
- net reward/benefit after economic mapping,
- reward per consumed resource,
- reward per participant,
- reward per time,
- maximum sustainable duration.

The exact definition of `net reward` belongs to L3 because the payment resource is not yet selected.

## Snapshot / determinism boundary

When Operational Cost becomes part of an exploration, the relevant cost inputs and resolved modifiers should be frozen at the same logical operation-start boundary used by exploration/equipment snapshots.

An already-started operation must not be silently rewritten by later changes to:

- equipment,
- formation composition,
- reduction configuration,
- balance configuration,
- route configuration.

The implementation details and schema impact are downstream work, but deterministic replay/simulation must remain possible.

## L2 invariants

The following are now fixed at the core-system design level:

1. Solo, Party, and Caravan use one common Operational Cost System.
2. Solo group/coordination overhead is zero or approximately zero by design.
3. Party incurs greater operational overhead than Solo under comparable conditions.
4. Caravan incurs greater operational overhead than Party under comparable conditions.
5. Duration is an input to operational cost.
6. Larger formations are expected to have greater cost growth as duration increases.
7. Cost sources remain distinguishable rather than collapsing immediately into one opaque value.
8. Cost reduction is a supported extension point.
9. Effective cost cannot be negative.
10. Operational Cost and Social Stress are separate concepts.
11. Gross reward/output remains separately measurable from operational cost.
12. Operation-start inputs should be snapshot/frozen for determinism once implementation reaches exploration integration.

## L3 decisions intentionally deferred

The following are **not** fixed here:

- which resource pays operational cost,
- whether multiple resources can pay different cost components,
- base numeric costs,
- Party/Caravan size thresholds,
- duration curve,
- nonlinear scale penalties,
- reduction stacking rules,
- reduction caps/floors,
- whether exactly zero effective cost is attainable,
- gross reward scaling by formation,
- Party reward split,
- Caravan reward distribution,
- exact Social Stress formula,
- recovery rates,
- final production balance.

## L4 decisions intentionally deferred

This ADR does not select concrete content such as:

- cost-reduction equipment,
- supply items,
- formation-specialist characters,
- camps/facilities,
- recovery events,
- Party UI,
- Caravan UI.

## M6 boundary

Acceptance of this ADR does not select Operational Cost as M6 scope.

It provides a stable L2 dependency baseline so that M6 candidates can be compared without leaving Solo/Party/Caravan economics structurally ambiguous.

No CP-50+ identifier is assigned by this ADR.

## Result

The previously separate concepts of Party cost, Caravan cost, Social/Coordination cost, Travel cost, Logistics cost, and Duration cost are now organized beneath one L2 Operational Cost System.

The next design layer is L3: choose the economic resource model and mathematical cost/reduction curves, or compare this L2 work against other M6 candidates before committing to implementation.
