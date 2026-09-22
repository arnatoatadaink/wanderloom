# CP-18 Claim / Equipment Race and Failure Validation — 2026-09-22

## Status

Implementation complete on `feat/cp-18-claim-equipment-race-validation`. WSL validation is pending.

## Objective

Prove that the M1 claim and equipment mutations cannot silently overwrite each other when both are derived from the same inventory version, and that claim retry/failure paths preserve exactly-once semantics.

## Race model

The validation intentionally avoids scheduler-dependent timing assertions.

Instead, both competing mutations are calculated from the same persisted inventory snapshot and then committed in controlled winner order against real D1.

This models the relevant race invariant deterministically:

```text
both operations read inventory version N
→ one commits N → N+1
→ the other must fail against stale expected version N
→ loser recalculates from fresh N+1
→ retry preserves winner state
```

## Real-D1 claim/equipment scenarios

Added `claim-equipment-race.integration.test.ts`.

### Equip wins first

```text
inventory v1
→ equip calculates v2
→ claim calculates v2 from same v1
→ equip commits
→ stale claim rejected: inventory version_conflict 1 -> 2
→ claim recalculated from fresh equipped inventory v2
→ claim commits v3
```

Acceptance assertions:

- equipped item remains equipped
- claim drop is appended after retry
- no inventory item is lost
- claim does not overwrite equipment state

### Claim wins first

```text
inventory v1
→ claim calculates v2
→ equip calculates v2 from same v1
→ claim commits
→ stale equip rejected: inventory version_conflict 1 -> 2
→ equip recalculated from fresh claimed inventory v2
→ equip commits v3
```

Acceptance assertions:

- claimed drop remains in inventory
- equipment retry succeeds
- claim-added item is not overwritten
- final equipment state is correct

## Double claim / response-lost behavior

The real-D1 test also submits the same claim mutation from the same snapshot more than once.

Expected behavior:

- exactly one commit succeeds
- competing/retried claim is classified as `already_claimed`
- archive contains exactly one row
- inventory contains the claim drop exactly once

A further retry after the successful commit models a client whose success response was lost after D1 committed the mutation. It must also return `already_claimed` rather than applying rewards again.

## Batch failure behavior

The D1 atomic repository unit test now covers an incomplete guarded claim batch result.

If the mutation guard was acquired but core/inventory/archive result counts do not satisfy the atomic invariant, the repository throws and never reports a successful commit.

This is a defensive invariant test around the repository contract. Actual D1 `batch()` transactional behavior remains provided by D1 itself.

## Existing stale-equipment coverage

CP-16 already validates:

- stale equipment version returns `version_conflict`
- same equip action retries idempotently
- invalid item/slot does not mutate inventory

CP-18 adds the cross-operation race coverage on top of those checks.

## Acceptance mapping

- competing claim/claim: implemented with same-version contention and exactly-one commit
- claim/equip race, equip-first: implemented with real D1
- claim/equip race, claim-first: implemented with real D1
- response lost after claim commit: modeled by post-commit identical retry
- stale equipment mutation: already covered and retained
- guarded batch incomplete result: unit coverage added
- no reward duplication: asserted
- no inventory overwrite: asserted
- no equipped-item loss: asserted
- deterministic conflict contracts: asserted

## Validation target

Run in WSL:

```bash
git fetch
git switch feat/cp-18-claim-equipment-race-validation

pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wanderloom/web measure:dist
git diff --check
```

After successful validation, CP-18 can be closed and CP-19 Full M1 acceptance loop can begin.
