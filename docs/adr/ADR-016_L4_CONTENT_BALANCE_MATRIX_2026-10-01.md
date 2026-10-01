# ADR-016 — L4 Content Balance Matrix

Date: 2026-10-01
Status: Accepted for initial validation baseline

## Context

ADR-015 defines the initial five-zone L4 content map. ADR-008 through ADR-012 define the initial formation economy and duration/rarity models. These systems now need to be evaluated together rather than in isolation.

## Decision

Create a deterministic 45-scenario content balance matrix:

- 5 production zones
- 3 duration classes: Short / Medium / Long
- 3 formation classes: Solo / Party / Caravan

The matrix combines:

- zone base Gold reward
- zone travel Gold cost
- zone risk index as an observed content parameter
- formation Operational Cost
- formation gross/net reward
- participant efficiency
- zone rarity tier
- duration Student's t rarity opportunity

## Initial integration rule

The first zone, Wayfarer Meadow, remains the reward anchor with `baseRewardGold = 10`.

For matrix validation only, each zone scales the existing ADR-009 gross formation reward table by:

`zoneRewardScale = zone.baseRewardGold / 10`

Operational Cost remains unchanged by zone. Travel Cost is added separately and is not reduced by Operational Cost reduction.

Risk Index is reported but does not yet modify Gold reward or failure probability. No implicit risk premium is introduced until a separate L3/L4 rule is accepted.

## Solo competitiveness diagnostic

For each Zone × Duration pair, compare Solo net reward per participant against the best Party/Caravan net reward per participant.

The initial diagnostic threshold is:

`Solo >= 90% of best group per-participant net reward`

This is a diagnostic, not yet a universal acceptance gate. It exists specifically to reveal where L4 reward scaling erodes the L0 Solo-competitiveness principle.

## Initial finding encoded by tests

Under simple zone reward scaling:

- Wayfarer Meadow / Short: passes the 90% Solo diagnostic
- Mossglass Grove / Short: passes narrowly
- Shattered Causeway / Short: fails
- Ashwind Highlands / Short: fails
- Starfall Frontier / Short: fails

This is intentional evidence that naive multiplicative zone reward scaling increases group advantage faster than fixed Operational Cost can offset it.

The implementation must surface this pressure rather than tune it away silently.

## Rarity behavior

Rarity opportunity is formation-independent for the same Zone × Duration pair.

- Zone tier controls reachability.
- Duration controls Student's t tail thickness.
- Duration cannot unlock a rarity excluded by the zone tier.

## Consequences

The next balancing step should adjust one or more of:

- formation reward scaling by zone
- formation Operational Cost scaling by zone/risk
- travel/logistics cost allocation
- Solo-specific efficiency advantages

without inflating Solo gross reward merely to force parity.

Production rarity resolution remains `legacy-weighted`; this matrix is design validation and does not cut over runtime rarity resolution.
