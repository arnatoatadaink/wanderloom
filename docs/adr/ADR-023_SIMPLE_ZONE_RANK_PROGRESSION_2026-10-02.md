# ADR-023: Simple Zone Rank Progression

- Status: Proposed for local acceptance
- Date: 2026-10-02
- Layer: L4 Content progression

## Context

Production zones already declare `minimumZoneRank` values 0 through 4. Player Level is intentionally neutral for content access, and Equipment remains the character-power axis. The remaining question is how a player advances Zone Rank.

The initial rule should be simple, observable, and low-bandwidth friendly. It should not require hidden counters, multiple currencies, repeated-clear thresholds, or Player Level checks.

## Decision

A player advances Zone Rank by exactly one when all of the following are true:

1. the expedition succeeds;
2. the completed zone has `minimumZoneRank === currentZoneRank`;
3. a higher configured Zone Rank exists.

Therefore:

```text
Rank 0: succeed once in Wayfarer Meadow    -> Rank 1
Rank 1: succeed once in Mossglass Grove    -> Rank 2
Rank 2: succeed once in Shattered Causeway -> Rank 3
Rank 3: succeed once in Ashwind Highlands  -> Rank 4
Rank 4: succeed in Starfall Frontier       -> remains Rank 4
```

Failure does not advance rank. Replaying a lower-rank zone does not advance rank. Clearing or requesting a later zone cannot skip ranks.

## Explicit non-requirements

Zone Rank advancement does not depend on:

- Player Level;
- Equipment quality or stats;
- Formation class;
- Duration class;
- Gold payment beyond the normal expedition costs;
- rarity drops;
- repeated-clear counters;
- consecutive-win streaks.

## Rationale

This keeps content access easy to understand: clear the frontier zone once to open the next one. It preserves the separation established by ADR-022:

- Player Level = progression / achievement indicator;
- Equipment = character-power axis;
- Zone Rank = content-access axis.

A more complex mastery or repeated-clear system can be layered later if progression proves too fast, without changing the initial content map.

## Runtime boundary

This ADR defines the domain resolver only. Persisting Zone Rank into the player snapshot and wiring advancement into live claim handling is a separate runtime integration step and requires its own acceptance tests.
