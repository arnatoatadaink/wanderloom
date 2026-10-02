# ADR-026: Zone Availability UI Contract

- Date: 2026-10-03
- Status: Proposed for local acceptance
- Layer: L4 content presentation / runtime integration boundary

## Context

ADR-023 through ADR-025 established Zone Rank progression, persistence, and runtime start gating for production zones. The Web client still consumes the older M2 smoke-zone list, while the production reward/runtime cutover is not yet complete.

Changing the visible zone list to production zones before the production reward/runtime path is ready would expose routes that cannot yet complete the full start/resolve/claim loop. The UI therefore needs an additive availability contract first.

## Decision

The Web zone model accepts two additive availability fields when supplied by the API:

- `minimumZoneRank`
- `unlocked`

Compatibility behavior is:

- missing `unlocked` => treat as unlocked
- `unlocked: false` => do not choose the zone as the initial route
- missing `minimumZoneRank` => show no rank requirement

The current M2 smoke-zone API remains unchanged in this PR. Production runtime cutover will later supply authoritative availability metadata.

## Rationale

This preserves the validated M2/M5 playable loop while making the Web selection model ready for production Zone Rank data. It also avoids duplicating Zone Rank authority in the browser before the server response is ready.

## Non-goals

- switching `/api/zones` from smoke zones to production zones
- changing production reward resolution
- changing duration timing
- changing claim rewards or rarity runtime
- styling locked destination cards

## Acceptance criteria

1. Legacy zone responses without availability metadata remain selectable.
2. Explicitly locked zones are not selected as the initial route.
3. Explicitly unlocked zones remain selectable.
4. Rank requirement labels can be derived when `minimumZoneRank` is present.
5. Existing Web tests and typecheck remain green.

## Follow-up

The next runtime integration should make the server return authoritative production-zone availability and then wire locked-card rendering/click prevention to this contract.
