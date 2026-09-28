# ADR-006 — Solo Competitiveness Through Low Operational Cost — 2026-09-28

## Status

**Accepted / L0 product principle**

## Context

Wanderloom is intended to support both solo and group-oriented play without making larger groups universally optimal.

A larger party or caravan can create greater gross output, but real-world organizations generally incur increasing coordination, logistics, and maintenance costs as scale grows. Wanderloom adopts this asymmetry as a product-level design principle.

The previous concept of social cost/stress is therefore generalized into a broader **Operational Cost** model. Social/coordination pressure remains one possible contributor, but operational cost may also represent logistics, travel, duration, maintenance, or other costs created by operating at larger scale.

## Decision

### L0 principle

**Solo Competitiveness = Low Operational Cost.**

Solo play must remain competitively viable because its operational cost is approximately zero or materially lower than larger formations.

Larger formations may have higher gross output, but they must also incur increasing operational cost. Therefore competitive value is evaluated using net efficiency and sustainable operation, not gross reward alone.

The intended qualitative ordering is:

```text
Solo operational cost << Party operational cost < Caravan operational cost
```

This ordering is a product invariant. Exact numerical values are not fixed at L0.

## Competitive dimensions

Solo competitiveness does not require equal gross reward.

Future balance should consider at least:

- net reward after operational cost,
- reward per unit of consumed resource,
- reward per participant where applicable,
- sustainable operating duration,
- risk exposure,
- setup / coordination overhead.

This permits different optimal formations for different situations.

Conceptually:

```text
Solo
  -> lower gross output
  -> minimal operational cost
  -> high efficiency
  -> long sustainable duration

Party
  -> higher gross output
  -> moderate operational cost
  -> medium sustainable duration

Caravan
  -> highest potential gross output
  -> highest operational cost
  -> strongest bias toward shorter / high-output operations
```

These are qualitative constraints, not final production balance values.

## Operational Cost hierarchy

The existing social-cost idea is reorganized under a broader system:

```text
Operational Cost
├─ Coordination / Social Cost
├─ Logistics Cost
├─ Travel Cost
├─ Formation Size Cost
└─ Duration Cost
```

Not every component must be implemented immediately. This hierarchy defines the design space and dependency direction.

`Social Stress` may remain a separate hidden gameplay state if later approved. It must not be treated as automatically identical to the resource cost paid by a formation.

## Normalized cost model

L3 balance work may use a normalized requirement such as:

```text
baseRequiredCost = 1.0
```

with reduction effects moving effective cost toward zero.

A possible contract form is:

```text
effectiveCost = max(0, baseRequiredCost * (1 - costReduction))
```

This formula is illustrative for later L2/L3 design. ADR-006 does **not** fix the final formula, reduction stacking rule, cost floor, or production values.

The important invariant is that cost-reduction mechanics can create specialization and competitive efficiency without requiring larger formations to lose their gross-output advantage.

## Scale and duration

Formation scale and operation duration are expected to interact.

A larger formation should generally become more expensive to sustain, especially over longer durations. This creates a target design space where:

- solo play is naturally strong for long-duration / low-overhead operation,
- parties occupy an intermediate efficiency/output space,
- caravans can specialize in short-duration / high-output activity.

The exact function may be linear, multiplicative, nonlinear, capped, or piecewise and belongs to later L3 balance work.

## Layer consequences

### L0 — Product / Principle

Fixed by this ADR:

- solo must remain viable through low operational cost,
- larger formations must not be universally dominant merely because they aggregate more participants,
- gross output and net efficiency are separate evaluation dimensions.

### L2 — Core Game System

Future system design should introduce an **Operational Cost System** above formation-specific mechanics.

Potential children include:

- Solo cost handling,
- Party operational cost,
- Caravan operational cost,
- coordination/social cost,
- travel/logistics cost,
- duration-related operating cost.

### L3 — Game Rule / Economy

Later balance work must determine:

- formation-size cost curve,
- duration cost curve,
- cost resource/type,
- cost-reduction rules,
- minimum/floor behavior,
- gross reward scaling,
- net reward / efficiency targets.

### L4 — Feature / Content

Content may later provide cost-reduction specialization through equipment, character traits, facilities, consumables, formation composition, or other mechanics. None are mandated here.

## Non-decisions

ADR-006 does not decide:

- whether operational cost consumes Gold, stamina, supplies, durability, time, or a dedicated resource,
- the final Party or Caravan implementation,
- Party size limits,
- Caravan size limits,
- matchmaking/invite mechanics,
- the final Social Stress model,
- exact cost formulas or production values,
- whether cost reduction can mathematically reach exactly zero,
- whether owned equipment can be lost,
- M6 scope or CP-50+ allocation.

## Constraints for future milestones

Future milestone design should not introduce a Party/Caravan economy in which larger formations dominate both gross output **and** net efficiency across substantially all operating durations without an explicit decision to supersede this ADR.

Likewise, balancing solo by simply inflating solo gross rewards is not the preferred default. Competitive viability should primarily emerge from lower operating cost and sustainable efficiency.

## Result

The previous open L0 item "solo competitiveness" is now considered **defined at the product-principle level**.

Implementation remains downstream work in L2/L3 and is not implied by acceptance of this ADR.
