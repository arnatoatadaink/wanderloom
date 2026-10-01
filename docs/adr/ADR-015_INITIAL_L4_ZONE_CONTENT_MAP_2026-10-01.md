# ADR-015: Initial L4 Zone Content Map

- Status: Proposed baseline
- Date: 2026-10-01
- Layer: L4 Feature / Content

## Context

ADR-014 fixed the L3 rarity-reachability tiers without assigning concrete production zones. The next step is to provide a small initial content progression that can connect exploration UX, progression gating, rarity reachability, reward tuning, travel cost, and later Solo / Party / Caravan balancing.

The repository does not yet contain authoritative production zone names or a fixed player-level unlock curve. Therefore this ADR introduces a Zone Rank abstraction rather than binding content unlocks directly to player level.

## Decision

Adopt the following initial five-zone content sequence.

| Zone Rank | Zone | Rarity Tier | Risk Index | Base Reward Gold | Travel Cost Gold |
| ---: | --- | --- | ---: | ---: | ---: |
| 0 | Wayfarer Meadow | Tier1 | 0.10 | 10 | 0 |
| 1 | Mossglass Grove | Tier1 | 0.16 | 14 | 1 |
| 2 | Shattered Causeway | Tier2 | 0.24 | 20 | 2 |
| 3 | Ashwind Highlands | Tier2 | 0.32 | 28 | 3 |
| 4 | Starfall Frontier | Tier3 | 0.42 | 40 | 5 |

## Separation of concerns

- Zone Rank controls content availability only.
- Player level / EXP-to-level mapping remains an L3 tuning decision and may later map to Zone Rank.
- Rarity reachability is inherited from ADR-014:
  - Tier1: Common / Uncommon / Rare
  - Tier2: Common through Legend
  - Tier3: all seven rarities
- Duration continues to control Student's t tail thickness with Short / Medium / Long df 8 / 6 / 5.
- Travel Cost is separate from formation Operational Cost.
- Base Reward Gold is a visible content baseline before duration, risk, formation, and other modifiers.

## Invariants

1. Zone Rank is strictly increasing across the initial map.
2. Risk is non-decreasing with progression.
3. Base visible reward is non-decreasing with progression.
4. Travel cost is non-decreasing with progression.
5. Tier3 is not reachable in the initial early/mid progression.
6. Duration never bypasses the zone rarity tier.
7. Zone naming and numeric values remain tunable content data, not architecture.

## Consequences

This creates a stable content-map contract without prematurely freezing the player-level curve. It also gives later balance work a concrete five-zone matrix for simulating visible Gold efficiency, rare-hunting value, operational cost, and sustainable Solo / Party / Caravan play.

## Deferred

- exact player level required for each Zone Rank
- per-zone EXP rewards
- per-zone item tables
- exact success/failure probability curves
- biome-specific mechanics and events
- Party / Caravan access restrictions or bonuses
- production cutover from legacy-weighted rarity resolution
