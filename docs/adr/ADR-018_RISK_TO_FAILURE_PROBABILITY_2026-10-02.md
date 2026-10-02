# ADR-018: Risk to Failure Probability Initial Model

- Status: Accepted initial L3 simulation baseline
- Date: 2026-10-02
- Scope: L3 game rule / economy calibration
- Production cutover: Not authorized by this ADR

## Context

ADR-017 uses Zone `riskIndex` to increase Party/Caravan Operational Cost while keeping Solo formation overhead neutral. The expedition outcome contract already separates two concepts:

1. `failureProbability`: how likely an expedition is to fail.
2. `LossPolicy`: what newly generated rewards are retained when failure happens.

The failure model should preserve that separation. It must not silently redefine Gold/EXP retention, drop-loss severity, owned equipment loss, or claim semantics.

## Decision

Use Zone `riskIndex` as a shared hazard input for a modest, duration-aware failure probability model:

```text
failureProbability = min(
  maxFailureProbability,
  baseFailureProbability
    + riskIndex * riskWeight * durationExposureMultiplier
)
```

Initial simulation parameters:

- base failure probability: `0.02`
- risk weight: `0.20`
- Short exposure multiplier: `0.75`
- Medium exposure multiplier: `1.00`
- Long exposure multiplier: `1.25`
- maximum failure probability: `0.15`

Representative results:

| Zone risk | Short | Medium | Long |
| ---: | ---: | ---: | ---: |
| 0.10 | 3.5% | 4.0% | 4.5% |
| 0.24 | 5.6% | 6.8% | 8.0% |
| 0.32 | 6.8% | 8.4% | 10.0% |
| 0.42 | 8.3% | 10.4% | 12.5% |

## Formation independence

For the same Zone and Duration, Solo / Party / Caravan use the same failure probability.

This is deliberate. Formation already affects economics through gross reward and Operational Cost. Adding a formation-based success bonus here would create another group advantage and would work against the accepted Solo-competitiveness principle.

## Relationship to Operational Cost

The same `riskIndex` may influence both:

- deterministic group coordination/logistics burden through ADR-017; and
- stochastic expedition failure exposure through this ADR.

These are separate consequences of the same Zone hazard, not two copies of the same Gold charge. Risk does not directly add Gold reward, and Travel Cost remains separate.

## Loss severity remains separate

This ADR does not select or change a production `LossPolicy`.

Existing contracts continue to determine retained Gold, retained EXP, and generated-drop retention on failure. Owned inventory/equipment remains outside the failure-loss contract unless a future ADR explicitly changes that rule.

## Runtime status

The model is initially exposed as a pure calculation and as diagnostics in the 45-scenario production content balance matrix. It does not by itself switch the live expedition resolver to stochastic failure selection.

A later cutover must separately define:

- deterministic seeded failure roll semantics;
- authoritative production LossPolicy values;
- UI risk preview wording;
- migration / replay determinism requirements.

## Consequences

- Zone progression now has an explicit risk-to-failure calibration surface.
- Long expeditions carry moderately higher exposure without approaching punitive failure rates.
- Formation choice does not alter failure probability in the initial baseline.
- Failure severity can be tuned independently of failure frequency.
