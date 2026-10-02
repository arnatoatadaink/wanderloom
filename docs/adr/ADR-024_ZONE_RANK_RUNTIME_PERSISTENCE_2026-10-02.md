# ADR-024: Zone Rank runtime persistence

- Status: Proposed for local acceptance
- Date: 2026-10-02
- Layer: L2/L4 runtime integration

## Context

ADR-023 defines the initial Zone Rank progression rule: one successful clear of the production zone whose `minimumZoneRank` equals the player's current Zone Rank advances the player by exactly one rank.

The domain resolver existed, but PlayerCoreSnapshot and the live claim calculation did not persist or apply Zone Rank.

## Decision

1. `PlayerCoreSnapshot` gains an optional `zoneRank` field for backward compatibility.
2. Missing `zoneRank` is interpreted as Rank 0 by `readPlayerZoneRank()`.
3. Every successful claim calculation writes an explicit `zoneRank` into `nextCore`, even when rank does not advance.
4. Production-zone claims use `resolveZoneRankProgression()`.
5. Only `resolution.result === "success"` counts as a successful clear.
6. Failure, lower-rank replay, rank mismatch and final-rank clears do not advance Zone Rank.
7. Legacy/non-production Zone IDs do not participate in production Zone Rank progression and preserve the current rank.
8. Player Level, Equipment, Formation, Duration, Gold, EXP and rarity do not participate in the unlock condition.
9. D1 continues to persist the complete core snapshot in `snapshot_json`; no new D1 column is required.
10. The current schema version remains unchanged because the field is additive and legacy snapshots are explicitly normalized at read/use time.

## Compatibility

A legacy snapshot without Zone Rank:

```ts
{
  schemaVersion: 1,
  // zoneRank absent
}
```

is treated as:

```text
zoneRank = 0
```

The next accepted claim emits an explicit `zoneRank` in the next core snapshot.

## Runtime flow

```text
D1 snapshot_json
  -> PlayerCoreSnapshot
  -> readPlayerZoneRank(snapshot)
  -> claim result + completed zone
  -> resolveZoneRankProgression (production zones only)
  -> nextCore.zoneRank
  -> atomic core/inventory claim mutation
  -> D1 snapshot_json
```

## Persistence

The existing D1 core repository serializes `PlayerCoreSnapshot` with `JSON.stringify(snapshot)` into `snapshot_json` and deserializes it with `JSON.parse`. Therefore explicit Zone Rank requires no D1 migration or repository SQL change.

A dedicated repository test verifies that `zoneRank` round-trips through this storage path.

## Acceptance

- legacy snapshot without `zoneRank` reads as Rank 0
- current-rank production Zone success advances exactly one rank
- failure does not advance
- lower-rank replay does not advance
- legacy/non-production zone claims remain compatible
- next claim snapshot always has explicit `zoneRank`
- D1 `snapshot_json` preserves `zoneRank` after save/reload
- existing reward, inventory and archive behavior remains unchanged
- workspace typecheck/test pass
