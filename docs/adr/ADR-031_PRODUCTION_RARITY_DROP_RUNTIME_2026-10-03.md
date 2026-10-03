# ADR-031 Production Rarity Drop Runtime

Date: 2026-10-03
Status: Proposed

## Context
Production Zone rarity calibration already defines Student-t based rarity selection by Zone rarity tier and duration. The production claim path currently returns no drops, while the M2 smoke path continues to use its legacy weighted reward configuration.

## Decision
Add a production-only generated-drop adapter that:

- uses `resolveProductionDuration` to identify production Zone/duration pairs;
- reads the Zone rarity tier from `INITIAL_PRODUCTION_ZONE_CONTENT_MAP`;
- builds the existing `buildProductionZoneRarityStrategy` Student-t strategy;
- generates exactly one drop per production expedition in this initial runtime slice;
- keeps Tier1 reachability at Common/Uncommon/Rare, Tier2 through Legend, and Tier3 through Phantasm;
- maps each rarity to a neutral initial production relic item definition;
- remains deterministic for the same seed, Zone, and duration;
- returns `null` for non-production inputs so smoke behavior can continue unchanged.

The neutral relic IDs are runtime content placeholders for the first production slice. Their gameplay/equipment effects are intentionally not defined by this ADR.

## Runtime boundary
This ADR establishes generated-drop selection only. Item instance creation still belongs to the API runtime because it owns `createItemInstanceId()` and claim timestamps. A follow-up wiring PR will instantiate retained production drops and attach them to the claim result.

## Loss behavior
`INITIAL_PRODUCTION_LOSS_POLICY.retainGeneratedDrops` remains authoritative. With the current value `false`, a failed production expedition loses its newly generated drop before inventory mutation.

## Compatibility
No `/api/zones` or Web cutover occurs here. Existing smoke rarity/drop behavior remains unchanged.
