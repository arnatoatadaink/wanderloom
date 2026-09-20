# CP-09 Atomic Level-3 Claim Mutation — Implementation Note

## Status

Implementation complete on `feat/cp-09-atomic-claim-mutation`. Workspace-level WSL validation is pending.

## Scope

CP-09 implements the D1 Level-3 claim mutation behind `AtomicMutationRepository`.

The claim batch contains six ordered statements:

1. acquire `player_mutation_guards`
2. update `player_core`
3. update `player_inventory`
4. insert `recent_archive`
5. prune old recent-archive rows
6. release the mutation guard

Cloudflare D1 `batch()` executes the statements as a transaction and rolls the sequence back when a statement fails.

## Guarded CAS design

A normal optimistic-lock `UPDATE ... WHERE state_version = ?` that affects zero rows is still a successful SQL statement. Therefore CP-09 does not rely on an update failure to protect the batch.

The first guard statement inserts a guard only when all of these match inside the same transaction:

- player ID
- expected core state version
- expected inventory state version
- active exploration ID
- active claim nonce

Every mutating statement after that is additionally gated by the acquired guard token.

If guard acquisition changes zero rows, all later mutation statements become no-ops. The repository then classifies the conflict by reading current state:

- matching archive row -> `already_claimed`
- changed core version -> core `version_conflict`
- changed inventory version -> inventory `version_conflict`
- otherwise -> `invalid_exploration_state`

This supports the response-lost-after-commit retry path without duplicating rewards.

## Archive retention

CP-09 does not choose a fixed 1/3/5-record product policy. `recentArchiveRetention` is injected into the repository constructor, keeping the existing WBS non-blocker unresolved.

## Deferred work

- D-004 retry/backoff policy remains pending.
- D-005 real D1 concurrency/failure integration tests remain pending.
- C-003 serialization and C-004 integrity validation remain pending.
- The same repository currently implements only the Level-3 `claim` variant; Level-1 and Level-2 mutations remain D-001/D-002 work.

## Validation target

Run in WSL:

```bash
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

After these pass, CP-09 can be closed and the next critical-path target is CP-10: Guest bootstrap + API wiring.
