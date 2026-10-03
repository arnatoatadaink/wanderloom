# ADR-033: Production Zone API Response Contract

Date: 2026-10-03
Status: Proposed

## Context

Production start, claim, progression, Zone Rank, and rarity/drop runtime paths are now available. The remaining catalog boundary is `/api/zones`, which still serves the M2 smoke catalog.

The production catalog must be player-state aware because Zone availability is derived from the persisted `zoneRank`. Snapshots created before Zone Rank persistence omit the field and must continue to behave as Rank 0.

## Decision

Introduce `buildProductionZoneApiResponse(core)` as the single response builder for the production zone catalog.

The builder:

- reads Zone Rank through `readPlayerZoneRank(core)`;
- treats legacy snapshots without `zoneRank` as Rank 0;
- returns all five production zones;
- marks availability with `minimumZoneRank` and `unlocked`;
- includes the authoritative production duration preview, failure risk, loss policy, and reachable rarity metadata.

The current Web `ZoneDto` already consumes the required `zoneId`, `name`, `durations`, and preview fields. Web exposure of `minimumZoneRank` and `unlocked` remains a follow-up UI contract change.

## Compatibility

This ADR does not yet change the live `/api/zones` handler. M2 smoke endpoint behavior therefore remains unchanged until the endpoint wiring PR is accepted.

## Follow-up

Wire `GET /api/zones` to load the player core snapshot and return `buildProductionZoneApiResponse(core)`. Then extend the Web DTO and selection logic so locked production zones cannot be selected and a successful Wayfarer claim visibly unlocks Mossglass.
