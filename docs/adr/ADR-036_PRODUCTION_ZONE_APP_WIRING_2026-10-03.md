# ADR-036: Production Zone App Wiring

Status: Proposed
Date: 2026-10-03

## Context

The live Worker now returns the Rank-aware production Zone catalog. The Web layer already has a pure production Zone UI contract that can render lock state, reject locked selections, validate start eligibility, and reconcile a refreshed catalog after progression changes.

## Decision

Wire `WanderloomApp` to that contract.

- `ZoneDto` exposes optional `minimumZoneRank` and `unlocked` fields for backward compatibility.
- Destination cards render Rank requirements and locked state.
- Locked destination cards are disabled in the DOM.
- Zone selection also passes through `selectProductionZone`, so locked selection remains rejected even if an event is triggered programmatically.
- Starting an expedition requires `canStartProductionZone` before the API call.
- After a successful claim, the app performs `GET /api/zones` only after the claim has completed, then applies `reconcileProductionZoneSelection`.
- The refreshed catalog therefore reflects persisted Zone Rank progression and can expose newly unlocked destinations such as Mossglass Grove after a successful Wayfarer claim.

## Ordering constraint

The claim and Zone refresh are intentionally sequential rather than parallel. Fetching Zones in parallel with the claim could observe the pre-claim Zone Rank and leave the UI stale until a later reload.

## Compatibility

- Zone availability fields remain optional so older/mock Zone payloads remain treated as unlocked.
- Existing exploration, inventory, persistence, Google identity, and archive flows are otherwise unchanged.
- Server-side Zone Rank start gating remains authoritative; the Web lock is an additional UX and client-side guard.

## Acceptance

Local acceptance must pass Web typecheck/tests, all workspace typechecks/tests, and `git diff --check`. GUI acceptance should verify that Rank 0 shows only Wayfarer as selectable and that a successful Wayfarer claim refreshes the catalog so Mossglass becomes selectable when Zone Rank advances to 1.
