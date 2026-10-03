# ADR-032: Production Drop Claim Wiring

Date: 2026-10-03
Status: Proposed

## Context

Production Gold, EXP, failure, LossPolicy, progression, and Student-t generated-drop selection are already available as separate runtime contracts. The remaining gap is carrying a production generated drop through claim retention into the persisted inventory and archive result.

## Decision

`resolveProductionClaim` will resolve the production generated drop before seeded expedition resolution and pass it into the existing `INITIAL_PRODUCTION_LOSS_POLICY` path.

- Successful production claims retain the generated drop.
- Failed production claims retain no generated drop because `retainGeneratedDrops` is false.
- Only retained generated drops are instantiated as inventory items.
- Item instance identifiers are supplied by the API runtime through `createItemInstanceId()`.
- `createdAt` uses the actual claim timestamp supplied by the API runtime.
- Calling `resolveProductionClaim(exploration)` without claim-instantiation arguments remains side-effect free and returns no instantiated drops. This preserves its use for production/smoke routing decisions.
- Existing M2 smoke drop behavior remains unchanged.

## Consequences

Production claim resolution can now produce persistent inventory rewards while preserving deterministic rarity selection and the existing claim transaction boundary. Failure does not consume an item instance identifier because lost generated drops are never instantiated.

## Deferred

This ADR does not switch `/api/zones` or the Web UI to the production catalog. That cutover remains a subsequent PR after production runtime claim semantics are fully connected.
