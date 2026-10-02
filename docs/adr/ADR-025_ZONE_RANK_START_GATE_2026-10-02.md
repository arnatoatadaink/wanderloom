# ADR-025: Zone Rank Start Gate

- Date: 2026-10-02
- Status: Proposed for local acceptance
- Layer: L4 content access / runtime integration

## Context

ADR-023 defines the simple Zone Rank progression rule and ADR-024 persists Zone Rank through claim and D1 snapshots. A runtime access gate is still required so a client cannot start a production Zone whose `minimumZoneRank` exceeds the player's persisted Zone Rank.

## Decision

`startExploration` enforces the production content map's `minimumZoneRank` before an exploration is created.

```text
player.zoneRank >= zone.minimumZoneRank
```

If `zoneRank` is missing from a legacy snapshot, ADR-024 compatibility applies and the value is read as Rank 0.

If a production Zone is locked, start returns:

```text
zone_locked {
  zoneId,
  currentZoneRank,
  requiredZoneRank
}
```

No core snapshot mutation or persistence write occurs for a rejected start.

## API contract

`zone_locked` is a public API error with HTTP 403 and `retryable=false`.

The client must progress Zone Rank before retrying the same locked Zone.

## Compatibility

The gate only applies to Zone IDs present in `INITIAL_PRODUCTION_ZONE_CONTENT_MAP`.

Legacy/non-production Zone IDs remain startable under the pre-existing rules. This preserves M1/M2 fixtures and allows the production content rollout to remain incremental.

## Ordering

The existing exploration-state check runs before the Zone Rank gate. If a player is already exploring, `invalid_exploration_state` remains the authoritative error rather than exposing a second access condition.

## Invariants

1. Wayfarer Meadow is accessible to a legacy snapshot with no explicit Zone Rank.
2. A production Zone above the current Rank is rejected before persistence.
3. A production Zone at or below the current Rank is accepted.
4. Lower-rank production Zones remain replayable.
5. Legacy/non-production Zone behavior is unchanged.
6. Player Level and Equipment do not bypass the gate.
7. Zone Rank remains the sole production Zone access axis.

## Acceptance

- game-core tests cover legacy Rank 0, locked production Zone, unlocked production Zone and non-production compatibility.
- API persistence tests prove a locked start performs no repository update.
- API contract exposes `zone_locked` as HTTP 403 and non-retryable.
- existing workspace typechecks and tests remain green.
