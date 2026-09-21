# CP-12 Playable Loop Test — Implementation Note

## Status

Implementation complete on `feat/cp-12-playable-loop-test`. WSL validation is pending.

## Scope

CP-12 adds an integration test that uses the Cloudflare Vitest D1 binding with the real project migration applied before the test.

The test exercises the API and actual D1 persistence path rather than repository fakes.

## Playable-loop scenario

The integration test performs:

1. apply D1 migrations
2. bootstrap a guest player
3. read the zone catalog
4. start the provisional M1 smoke expedition
5. confirm the persisted/current exploration
6. advance the injected server clock beyond `endsAt`
7. claim the expedition
8. verify Gold / EXP and snapshot state versions
9. verify `recent_archive` contains exactly one row
10. retry the same claim
11. verify HTTP `already_claimed` and unchanged rewards
12. start another expedition successfully

This proves the minimum exploration loop can repeat without duplicating the first claim.

## D1 test setup

`vitest.config.ts` now uses Cloudflare's `readD1Migrations()` to expose the project's migration files to the Workers test runtime.

The integration test uses `applyD1Migrations()` from `cloudflare:test` against the configured `env.DB` binding.

No separate in-memory schema copy is maintained in the test.

## HTTP retry correction

CP-12 exposed an API-level retry gap: after a successful claim the core snapshot has no active exploration, so a response-lost retry previously returned `invalid_exploration_state` before CP-09's duplicate-claim classification could be observed.

The claim route now checks `recent_archive` for the requested exploration before returning an invalid-state error. A committed retry returns:

- HTTP 409
- `already_claimed`
- original `claimedAt`

The test verifies rewards remain Gold 5 / EXP 10 and core `stateVersion` remains 2 after the retry.

## Coverage boundary

This is an HTTP + real D1 playable-loop integration test.

It does not automate browser DOM clicks. CP-11 already tests the client API/view-model boundary; a full browser runner can be added later if UI interaction regression coverage becomes necessary.

Equipment is still outside this loop because W3-009/W4-007 depend on unresolved drop/equipment rules.

## Validation target

Run in WSL:

```bash
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

After validation, CP-12 can be closed and CP-13 balance/payload validation can begin.
