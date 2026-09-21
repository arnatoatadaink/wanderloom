# CP-11 Mobile Exploration UI Integration — Implementation Note

## Status

Implementation and WSL validation complete on `feat/cp-11-mobile-exploration-ui`.

## Scope

CP-11 wires the mobile-first web client to the CP-10 exploration API loop.

Implemented UI flow:

1. load or bootstrap guest identity
2. fetch zones and player state
3. choose destination
4. choose duration
5. start expedition
6. show exploring state and server-authoritative countdown
7. enable claim when `endsAt` is reached
8. claim through the API
9. show result rewards
10. return to destination selection

## Implemented W4 items

- W4-001 mobile shell
- W4-002 destination card
- W4-003 compact player/route metrics
- W4-004 duration selector
- W4-005 exploration state screen
- W4-006 result screen

W4-007 inventory/equipment, W4-008 compact-number formatting, and W4-009 low-bandwidth asset measurement remain separate work.

## Guest identity

The web client stores the temporary M1 guest player ID under:

`wanderloom.playerId`

and sends it in:

`x-wanderloom-player-id`

This is a temporary transport contract for the guest-first prototype, not a final authentication design.

## Server authority

The client sends only action inputs. It does not calculate or submit authoritative:

- exploration timestamps
- duration milliseconds
- seed
- claim nonce
- reward result
- Gold / EXP
- drops

The countdown is derived from the server-provided `endsAt`.

## Low-bandwidth implementation

The CP-11 shell uses:

- Vanilla TypeScript
- CSS only
- no image assets
- no UI framework
- no icon/font package
- no client game-balance bundle

This keeps the initial UI payload small and preserves the low-bandwidth-first direction.

## Local development

Run Worker and web development servers separately.

Worker:

```bash
pnpm --filter @wanderloom/api dev
```

Web:

```bash
pnpm --filter @wanderloom/web dev
```

Vite proxies `/api` to Wrangler at `http://127.0.0.1:8787`.

## Tests

Added pure tests for:

- initial zone/duration selection
- exploring -> claimable transition from server end time
- countdown rounding/clamping
- guest bootstrap identity storage in the API client
- guest header propagation

The browser DOM rendering itself is not yet exercised in a browser integration test. That belongs with CP-12 playable-loop validation.

## Validation result

WSL validation passed:

- workspace typecheck: passed for `packages/game-core`, `apps/web`, and `workers/api`
- initial TypeScript 7 failure on `./styles.css` side-effect import was fixed by adding `types: ["vite/client"]` to `apps/web/tsconfig.json`
- workspace tests: passed
  - `packages/game-core`: 16 tests across 7 files
  - `apps/web`: 6 tests across 3 files
  - `workers/api`: 13 tests across 5 files
- workspace build: passed
  - web Vite build: JS 11.01 KiB / gzip 3.51 KiB, CSS 3.52 KiB / gzip 1.41 KiB
  - `game-core` TypeScript build
  - Wrangler dry-run build with `env.DB` D1 binding
- `git diff --check`: passed

CP-11 is complete. The next critical-path target is CP-12: Playable loop test.
