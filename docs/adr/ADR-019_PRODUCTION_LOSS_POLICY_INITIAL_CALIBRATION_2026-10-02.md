# ADR-019: Production Loss Policy Initial Calibration

Status: Proposed L3 production-candidate calibration
Date: 2026-10-02

## Context

ADR-018 introduced a Zone risk and duration based failure-frequency model while preserving the existing separation between failure probability and `LossPolicy` severity. The existing M2 examples used 50% Gold retention, 25% EXP retention, and loss of newly generated drops on failure. Those values were useful as a contract example but were never accepted as production balance values.

The initial production content matrix now exposes failure probabilities from 3.5% at Wayfarer Meadow / Short to 12.5% at Starfall Frontier / Long. A production-candidate severity policy must therefore be evaluated as `failure frequency x loss severity`, not as a standalone percentage.

## Decision

Use the following initial L3 production-candidate `LossPolicy` for balance analysis:

- retained Gold on failure: 50%
- retained EXP on failure: 50%
- newly generated drops retained on failure: false
- existing owned inventory/equipment: never part of this loss policy

This is a calibration candidate, not yet authorization to switch the live resolver to stochastic failure selection.

## Rationale

Gold and EXP use symmetric severity because there is no accepted design reason yet to punish progression more strongly than currency. At the maximum initial failure probability of 12.5%, both Gold and EXP retain 93.75% of their generated value in expectation. Generated drops remain higher-variance rewards and are retained only on success, producing an 87.5% expected retention ratio at the same maximum failure probability.

Fixed Gold costs such as Operational Cost and Travel Cost are paid independently of expedition success and are therefore subtracted after expected generated Gold is calculated. They are not probabilistically refunded on failure.

## Expected-value formulas

For failure probability `p` and failure retention ratio `r`:

```text
expectedRetention = (1 - p) + p * r
```

For the initial Gold/EXP candidate where `r = 0.5`:

```text
expectedGoldRetention = 1 - 0.5p
expectedExpRetention  = 1 - 0.5p
```

For generated drops where failure retention is zero:

```text
expectedDropRetention = 1 - p
```

Expected Net Gold is calculated as:

```text
expectedNetGold = generatedGrossGold * expectedGoldRetention - fixedGoldCosts
```

## Initial range

- Wayfarer Meadow / Short, p=3.5%:
  - expected Gold retention: 98.25%
  - expected EXP retention: 98.25%
  - expected drop retention: 96.5%
- Starfall Frontier / Long, p=12.5%:
  - expected Gold retention: 93.75%
  - expected EXP retention: 93.75%
  - expected drop retention: 87.5%

## Invariants

1. Failure frequency remains controlled by the risk-failure model, not by `LossPolicy`.
2. Same Zone x Duration keeps the same failure probability and severity across Solo, Party, and Caravan.
3. Group play is not granted a hidden survival advantage.
4. Existing owned equipment is not lost by this policy.
5. Fixed Operational/Travel costs are not refunded on failure.
6. Absolute EXP generation remains a separate tuning problem; the content matrix currently reports EXP retention ratios rather than inventing an EXP reward table.
7. Production rarity resolution remains `legacy-weighted` until separately authorized.

## Acceptance criteria

- all initial 45 content scenarios retain non-negative expected Net Gold
- Gold and EXP expected retention remain symmetric under the initial candidate
- maximum initial failure probability does not reduce expected Gold or EXP below 90%
- generated-drop expected retention equals success probability when `retainGeneratedDrops=false`
- no owned-equipment loss is introduced

## Consequences

The next balance step can compare actual or proposed EXP reward tables against the accepted retention ratios without changing failure-frequency logic. A later runtime cutover must separately decide when and where stochastic outcome resolution becomes live.
