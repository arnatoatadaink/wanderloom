# ADR-034: Production Zone API Endpoint Cutover

Date: 2026-10-03
Status: Proposed

## Context

The production Zone catalog, preview contract, Zone Rank persistence/gating, production claim resolution, progression, and rarity/drop runtime are already available. `GET /api/zones` still returns the legacy M2 smoke Zone catalog, so clients cannot discover the production catalog from the live Worker endpoint.

## Decision

Wire the live Worker `GET /api/zones` route to the persisted player core snapshot and return `buildProductionZoneApiResponse(core)`.

The endpoint therefore becomes Rank-aware:

- missing `zoneRank` is interpreted as Rank 0 through `readPlayerZoneRank`
- Rank 0 exposes all production Zone metadata but only Wayfarer Meadow as `unlocked: true`
- higher ranks update `unlocked` according to each Zone's `minimumZoneRank`
- production duration previews, failure risk, loss policy, and rarity metadata are returned unchanged from the established production preview contract

If the player core snapshot does not exist, the endpoint returns the existing `player_not_found` API error. Missing player identity remains `missing_player_id`.

## Compatibility

This PR changes only the live Worker Zone discovery endpoint. The lower-level `createApi()` smoke contract remains available for existing regression tests and compatibility paths. Start, claim, inventory, archive, and Web UI rendering behavior are otherwise unchanged.

The Web client already accepts the production preview fields it currently consumes; explicit `minimumZoneRank` / `unlocked` UI handling remains a follow-up.

## Consequences

Production runtime and live production discovery now use the same authoritative Zone set. A following Web PR can expose locked states and verify Wayfarer success -> Zone Rank 1 -> Mossglass unlock without another live API contract change.
