# M2 Solo Progression Slice — Closure — 2026-09-24

## Status

**Complete**

M2 closes the Solo Progression Slice defined in `M2_PROPOSED_CRITICAL_PATH_2026-09-23.md`.

## Completed critical path

- CP-20 Failure / Drop-loss — Complete
- CP-21 Growth / Progression — Complete
- CP-22 Rarity + Multi-zone — Complete
- CP-23 Equipment → Exploration — Complete
- CP-24 Balance Simulator — Complete
- CP-25 API / UI Integration — Complete
- CP-26 Migration / Concurrency Regression — Complete
- CP-27 Full M2 Acceptance — Complete

## Accepted playable loop

The accepted M2 loop is:

compare zone/duration choices
→ preview reward/risk/rarities
→ start exploration with frozen character/equipment state
→ resolve success/failure on the server
→ atomically claim retained rewards/loss outcome
→ apply progression exactly once
→ inspect rarity-bearing item
→ equip item
→ start another exploration
→ observe changed frozen effective stats

## Final validation state

Latest user-reported validation:

- workspace typecheck: PASS
- game-core: 47 tests PASS
- web: 10 tests PASS
- Worker: 24 tests PASS
- total: **81 tests PASS**
- CP-27 real-D1 full acceptance: PASS
- CP-26 failure/progression/retry real-D1 regression: PASS
- CP-19 playable-loop real-D1 regression: PASS
- CP-18 claim/equipment concurrency regression: PASS
- diff check: clean
- preceding CP-27 workspace build/dry-run: PASS

## Explicit non-final values

The following remain provisional configuration rather than production-approved balance:

- zone names/content
- duration lengths
- failure probability
- Gold/EXP retention ratios
- rarity weights
- drop counts
- equipment stat modifiers
- progression curve values

The CP-24 simulator exists to measure and tune these values later.

## Deferred / post-M2

Outside M2 and still unresolved or deferred:

- production balance tuning
- OIDC/account linking
- Google appDataFolder/archive synchronization
- monetization
- Party
- Caravan
- AI-assisted features
- existing-owned/equipped-item loss and its protection/recovery design

## Integration state

M2 integration branch: `m2`

CP-27 merge commit: `9993d36ef12de520f439d6cdca495cc497901b2c`

The next planning step should define the post-M2 milestone before new gameplay scope is added.
