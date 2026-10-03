# ADR-035 Production Zone Web UI Contract

Status: Proposed
Date: 2026-10-03

## Context

The live Worker `/api/zones` endpoint now returns the five production zones with persisted Zone Rank availability. The existing Web app can render the production preview shape, but it does not yet enforce `unlocked` in selection or refresh availability after a successful claim.

The Web application file is relatively large, so the availability behavior should be fixed in a small pure contract before wiring it into the DOM/event layer.

## Decision

Introduce `production-zone-ui.ts` as the Web-side production availability contract.

It shall:

- expose card state including lock state and minimum-rank label;
- ignore attempts to select locked zones;
- allow start only when the selected zone is unlocked and the duration belongs to that zone;
- reconcile a refreshed production catalog with the current selection;
- allow Mossglass selection after a refreshed Rank 1 catalog marks it unlocked;
- preserve the existing compatibility rule that zones without explicit availability metadata are treated as unlocked.

## Follow-up wiring

A follow-up PR will wire this contract into `WanderloomApp`:

1. render locked zone cards with their Zone Rank requirement;
2. disable locked zone controls;
3. guard `startExploration()` with the production UI contract;
4. fetch `/api/zones` again after claim;
5. reconcile the refreshed catalog before returning to the ready screen.

This ADR does not change the live DOM behavior by itself.
