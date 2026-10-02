# ADR-020: Zone × Duration EXP Reward Baseline

- Status: Accepted for initial L4 validation baseline
- Date: 2026-10-02

## Context

ADR-018 connected Zone risk and Duration to failure probability. ADR-019 selected an initial production-candidate LossPolicy and added expected-value diagnostics, but EXP remained ratio-only because no production EXP reward table existed.

Before stochastic failure resolution is connected to the live runtime, the economy needs a closed expected-value path for Gold, EXP, rarity opportunity, failure frequency, and failure severity.

## Decision

Define a 5 Zone × 3 Duration absolute EXP baseline. EXP is intentionally independent from formation class.

| Zone | Short | Medium | Long |
| --- | ---: | ---: | ---: |
| Wayfarer Meadow | 8 | 28 | 80 |
| Mossglass Grove | 11 | 39 | 110 |
| Shattered Causeway | 16 | 56 | 160 |
| Ashwind Highlands | 22 | 77 | 220 |
| Starfall Frontier | 30 | 105 | 300 |

The initial duration shape is approximately:

- Short: ×1.0
- Medium: ×3.5
- Long: ×10.0

Duration hours remain:

- Short: 0.5 h
- Medium: 2 h
- Long: 8 h

Therefore EXP/hour intentionally decreases with duration. Long exploration gains more total EXP and better rarity opportunity, but does not become the dominant progression choice purely because time elapsed.

## Invariants

1. Each production zone has exactly one EXP reward row.
2. Absolute EXP increases with Zone progression for each Duration.
3. Absolute EXP increases Short < Medium < Long within each Zone.
4. EXP/hour decreases Short > Medium > Long within each Zone.
5. EXP reward is formation-independent for the same Zone × Duration.
6. Failure frequency remains controlled by ADR-018.
7. Loss severity remains controlled by ADR-019.
8. Owned inventory/equipment remains outside failure loss.

## Expected-value integration

The production content balance matrix now passes generated EXP into the LossPolicy expectation model.

With the ADR-019 symmetric 50% EXP retention policy:

```text
expectedExp = generatedExp × (1 - failureProbability × 0.5)
```

Representative high-risk case:

- Starfall Frontier / Long
- generated EXP = 300
- failure probability = 12.5%
- expected EXP retention = 93.75%
- expected EXP = 281.25
- expected EXP/hour = 35.15625

## Consequences

This closes the initial analytical reward path:

```text
Zone × Duration
→ Gold / EXP / Rarity Opportunity
→ Failure Probability
→ LossPolicy
→ Expected Gold / EXP / Drop retention
```

The table remains tunable L4 content data. It does not define the player level curve itself and does not authorize stochastic runtime cutover.

## Deferred

- production level/EXP requirement curve calibration
- formation-specific EXP bonuses
- equipment or skill modifiers to EXP
- live stochastic failure selection
- stochastic production rarity resolver cutover
