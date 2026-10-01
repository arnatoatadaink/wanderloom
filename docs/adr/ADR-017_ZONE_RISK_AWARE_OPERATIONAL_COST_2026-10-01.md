# ADR-017: Zone/Risk-aware Operational Cost

Status: Proposed for local acceptance
Date: 2026-10-01
Layer: L3 / L4 integration

## Context

ADR-006 defines Solo competitiveness primarily through low operational cost. ADR-007 separates Operational Cost from Social Stress and keeps travel/content cost distinct. ADR-016 showed that simply scaling formation gross reward with Zone base reward causes Short-duration Solo efficiency to fall below the 90% diagnostic floor in higher-value zones.

The system needs a Zone-aware overhead mechanism that increases coordination/logistics burden for larger formations without adding arbitrary reward bonuses to Solo.

## Decision

Apply a multiplicative Zone/Risk factor to the formation base Operational Cost only.

```text
zoneRiskOperationalCostMultiplier
  = 1 + formationSensitivity * riskIndex * zoneRewardScale
```

Initial sensitivities:

- Solo: 0.0
- Party: 2.6
- Caravan: 3.2

Where:

- `riskIndex` is the Zone L4 risk value in [0, 1]
- `zoneRewardScale` is the Zone base Gold reward relative to Wayfarer Meadow
- `formationSensitivity` represents coordination/logistics exposure to Zone complexity

The multiplier is applied before the existing duration cost multiplier. Travel Cost remains separate and is not multiplied. Generic Operational Cost reduction continues to act on the resulting Operational Cost through the existing economy model.

## Rationale

This preserves the L0/L2 principle that Solo has near-zero formation overhead while larger formations face higher coordination/logistics burden in more valuable and riskier content.

It also avoids inventing a direct Gold value for risk itself. Risk remains a content input that affects group overhead; no risk-reward premium or failure-probability formula is introduced here.

## Initial balance result

Using the initial five-Zone content map and default participant counts:

- all Short-duration Solo diagnostics recover to >= 90% of the best group's per-participant net reward
- Solo remains overhead-neutral
- Party overhead increases with Zone risk/value
- Caravan sensitivity remains greater than Party sensitivity
- Medium/Long Solo efficiency remains viable
- total formation output ordering and non-negative net reward remain acceptance requirements

The 2.6 / 3.2 sensitivities are tunable balance parameters, not permanent product constants.

## Non-goals

This ADR does not define:

- failure probability from `riskIndex`
- risk-based reward bonuses
- Social Stress conversion to Gold
- Party/Caravan production participant-count curves
- production rarity cutover

## Acceptance

The initial integrated matrix must satisfy:

1. Solo Zone/Risk multiplier = 1.0 for every Zone.
2. Party multiplier > 1 in positive-risk Zones.
3. Caravan multiplier > Party multiplier for the same Zone.
4. All initial Short Solo diagnostics are >= 0.90.
5. All matrix net rewards remain non-negative.
6. Solo < Party < Caravan total net output remains true for each Zone x Duration scenario.
