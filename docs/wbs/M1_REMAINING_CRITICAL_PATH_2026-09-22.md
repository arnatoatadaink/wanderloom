# Wanderloom M1 Remaining Critical Path — 2026-09-22

## Phase

M1 remaining blockers re-sequencing.

## Objective

Rebuild the critical path after CP-13 so the remaining work maps directly to the M1 Definition of Done.

The goal is not to complete the full long-term balance system before M1. The goal is to prove one complete solo loop that can:

1. start an expedition
2. resolve a reward with at least one real item drop
3. claim exactly once
4. persist the drop
5. equip the drop
6. survive claim/equipment concurrency
7. repeat the loop

Formal failure/loss tuning and long-term growth balancing remain outside the M1 critical path unless implementation reveals that they are required by a hard dependency.

## Re-sequenced Critical Path

### CP-14 — M1 reward/drop contract — complete

Primary WBS mapping:

- W1-003 Risk/reward interfaces
- E-003 Resolution contract, interface portion

Deliverables:

- explicit M1 reward contract
- explicit drop-generation input/output contract
- deterministic seed boundary
- item definition / item instance creation boundary
- risk/reward preview DTO fields required by the existing UI/API
- no D1 dependency in game-core

Acceptance:

- reward/drop contract compiles in game-core
- one M1 drop can be represented end-to-end without provisional `unknown[]`
- API/client types can represent reward preview and drop result
- exact rarity percentages are not required

Reason for position:

Equipment cannot be implemented safely until a claimed item has an explicit domain contract.

---

### CP-15 — Seeded M1 resolution with real drop — implementation complete; validation pending

Primary WBS mapping:

- W1-004 Seeded resolution
- E-003 Resolution, implementation portion
- W3-004/W3-007 replacement of provisional no-drop smoke resolution

Deliverables:

- pure seeded resolver
- deterministic Gold / EXP / drop result for the same seed + inputs
- at least one M1 item definition capable of being dropped
- claim persists the generated ItemInstance into inventory
- archive records the same reward/drop result
- provisional `m1-smoke` no-drop fixture is either replaced or isolated to tests only

Acceptance:

- same seed produces the same result
- a successful integration path yields at least one real drop
- claim retry still cannot duplicate the item
- snapshot/payload budgets continue to pass

Reason for position:

M1 DoD item 8 requires receiving Gold / EXP / drop before equipment work is meaningful.

---

### CP-16 — Equipment domain + atomic persistence/API

Primary WBS mapping:

- W3-009 Equipment mutation
- W2-009 Atomic Level-2 mutation
- D-002 Level 2 mutation
- D-004 Retry behavior, equipment portion

Deliverables:

- minimum equipment-slot vocabulary for M1
- pure equip validation in game-core
- equipment mutation result/error contract
- D1 atomic core/inventory or inventory mutation as appropriate
- `POST /api/equipment`
- optimistic version guard
- item ownership validation
- idempotent/retry-safe behavior where applicable

Acceptance:

- owned dropped item can be equipped
- missing item / invalid slot is rejected
- stale inventory version is rejected without overwrite
- existing claim path remains unchanged

Reason for position:

This closes M1 DoD item 9 at the backend/domain boundary.

---

### CP-17 — Inventory / equipment minimum UI

Primary WBS mapping:

- W4-007 inventory/equipment minimum
- W4-008 compact number formatting only if required by this screen

Deliverables:

- inventory list
- equipped state
- one minimum equip action
- API client method for equipment mutation
- refresh/reconciliation after equip
- low-bandwidth-first UI only; no new heavy asset dependency

Acceptance:

- player can claim a drop, see it, equip it, and see the equipped state
- errors are surfaced without corrupting local view state
- bundle budget remains within CP-13 guardrails or any increase is explicitly reviewed

Reason for position:

This closes M1 DoD item 9 at the user-visible boundary.

---

### CP-18 — Claim/equipment race and failure validation

Primary WBS mapping:

- W5-003 optimistic-lock conflict tests
- D-005 Failure tests
- D-004 Retry behavior
- remaining concurrency acceptance from M1 DoD

Required scenarios:

- simultaneous claim / claim
- claim / equip race
- response lost after claim commit
- stale equipment mutation
- batch SQL failure where practical in the current test runtime

Acceptance:

- no reward duplication
- no inventory overwrite
- no equipped-item loss caused by a stale write
- conflicts return deterministic error contracts
- real-D1 integration coverage exists for claim/equip race behavior

Reason for position:

M1 DoD explicitly requires concurrent equipment/claim operations not to overwrite each other.

---

### CP-19 — Full M1 acceptance loop

Primary WBS mapping:

- final M1 Definition of Done validation

Required end-to-end loop:

```text
guest bootstrap
→ view zone + reward/risk preview
→ select duration
→ start expedition
→ wait/advance server-authoritative end time
→ claim exactly once
→ receive Gold + EXP + real item drop
→ view inventory
→ equip the drop
→ start another expedition
```

Additional acceptance:

- duplicate claim does not duplicate rewards/items
- claim/equip concurrency does not overwrite state
- snapshot size budgets pass
- API payload budgets pass
- web bundle budget passes
- game-core remains independent of Worker / D1 / DOM

CP-19 completion means the current M1 Playable Solo Prototype Definition of Done is satisfied.

## Work explicitly outside the M1 critical path

The following remain important but are not hard blockers for the current M1 prototype unless a dependency emerges:

- W1-005 Failure/drop-loss model
- W1-006 Growth model
- exact rarity percentages
- full balance simulation beyond deterministic M1 validation
- Google appDataFolder archive integration
- ads / rewarded ads / billing
- OIDC linking
- Party / Caravan
- long-term archive compaction

These should remain in the WBS but must not delay CP-14 through CP-19.

## Immediate next action

Validate CP-15 in WSL. After successful validation, close CP-15 and start CP-16 Equipment domain + atomic persistence/API.
