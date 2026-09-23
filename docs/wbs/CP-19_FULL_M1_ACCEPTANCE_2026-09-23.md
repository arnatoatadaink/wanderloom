# CP-19 Full M1 Acceptance Loop — 2026-09-23

## Status

Implementation complete on `feat/cp-19-m1-acceptance-loop`. Final WSL validation is pending.

## Objective

Perform the final M1 Playable Solo Prototype acceptance pass by combining the real-D1 playable loop, the minimum web equipment client/UI coverage, concurrency validation, payload/snapshot budgets, bundle budgets, and the game-core architecture boundary.

CP-19 intentionally adds no new gameplay system.

## Canonical M1 acceptance path

The existing real-D1 playable-loop integration test is promoted to the CP-19 acceptance path and now explicitly verifies:

```text
guest bootstrap
→ zone catalog + reward preview
→ select short duration
→ start expedition
→ observe server-authoritative end time
→ advance test clock past end
→ claim exactly once
→ receive Gold + EXP + real m1-wayfarer-charm drop
→ persist inventory/archive
→ reject duplicate claim
→ equip dropped charm
→ retry equip idempotently
→ reject stale equipment write
→ verify equipped inventory
→ start another expedition
→ verify equipped inventory survives restart
```

The zone preview asserted by the same path is:

- Gold: 5–6
- EXP: 10
- Drops: 1

These remain M1 provisional balance values, not final economy tuning.

## Acceptance evidence matrix

| M1 requirement | Evidence |
| --- | --- |
| Guest bootstrap | `playable-loop.integration.test.ts` |
| Zone + reward preview | CP-19 assertion in `playable-loop.integration.test.ts` |
| Duration selection/start | `playable-loop.integration.test.ts` |
| Server-authoritative end time | start/current exploration assertions |
| Seeded reward resolution | CP-15 game-core tests + real claim path |
| Gold + EXP + real drop | `playable-loop.integration.test.ts` |
| Exactly-once claim | playable-loop duplicate claim + CP-18 double-claim race |
| Drop persistence | inventory + archive assertions |
| Inventory visible to web client | CP-17 API client + minimum UI implementation |
| Equip dropped item | CP-16/17 + CP-19 real-D1 path |
| Equip retry safety | CP-16/19 idempotent retry |
| Claim/equip concurrency | CP-18 real-D1 race tests |
| Response lost after claim commit | CP-18 post-commit retry |
| Snapshot/API payload budgets | CP-13 guards retained in playable loop |
| Web bundle budget | `measure:dist` final validation |
| game-core runtime independence | package/source architecture review: no Worker, D1, DOM, or Cloudflare runtime dependency in game-core |
| Repeat loop | second expedition starts after claim/equip |

## CP-19 code changes

### Playable loop promotion

`workers/api/src/playable-loop.integration.test.ts` now:

- identifies itself as the CP-19 full M1 acceptance loop
- asserts the reward preview returned by `GET /api/zones`
- verifies final equipped inventory after the second expedition starts

### Architecture boundary

No runtime dependency was added to game-core.

The final acceptance review checks that:

- `@wanderloom/game-core` has no runtime dependencies
- Worker/API depends on game-core, not the reverse
- game-core domain code does not require Worker, D1, DOM, or browser globals

This remains an architectural acceptance check rather than adding Node filesystem dependencies to the game-core test package.

## Explicitly outside M1 completion

The following remain deferred and do not block CP-19:

- failure/drop-loss model
- long-term growth model
- exact rarity probabilities
- production economy tuning
- appDataFolder archive integration
- OIDC linking
- ads/billing
- Party/Caravan
- long-term archive compaction

## Final validation target

Run in WSL:

```bash
git fetch
git switch feat/cp-19-m1-acceptance-loop

pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wanderloom/web measure:dist
git diff --check
```

Expected acceptance:

- all workspace typechecks pass
- all tests pass, including CP-18 races and CP-19 full loop
- all builds pass
- CP-13 snapshot/API payload guards pass
- web bundle remains within CP-13 budgets
- `git diff --check` is clean

After this validation succeeds, CP-19 and the current M1 Playable Solo Prototype Definition of Done can be closed.
