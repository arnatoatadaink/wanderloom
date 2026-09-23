# Wanderloom M2 Proposed Critical Path — 2026-09-23

## Phase

Post-M1 planning / provisional M2 critical-path definition.

## Starting point

M1 Playable Solo Prototype is complete through CP-19.

M1 proved the technical loop and its safety properties. M2 should therefore deepen the solo game loop before adding external account, archive, monetization, social, or AI dependencies.

## Proposed M2 objective

Turn the M1 deterministic prototype into a repeatable solo progression slice with meaningful risk, growth, item rarity, and measurable balance.

Proposed M2 loop:

```text
choose zone/duration/risk
→ start expedition
→ seeded success/failure resolution
→ receive or lose rewards according to explicit rules
→ gain EXP / level / progression
→ obtain rarity-bearing equipment
→ equip and change future expedition outcome
→ repeat across more than one progression step
```

This objective is provisional until explicitly accepted.

## Proposed Critical Path

### CP-20 — Failure / drop-loss domain contract

Primary mapping:

- W1-005 Failure/drop-loss model
- E-003 survival/final outcome

Deliverables:

- explicit success/failure outcome contract
- deterministic seeded failure boundary
- explicit loss policy inputs/outputs
- archive representation of failed expeditions
- preview representation of risk
- no persistence/API coupling in game-core

Acceptance:

- same seed + same inputs yields same outcome
- success and failure can both be represented
- failure cannot create duplicate/lost state through retry
- loss rules are explicit rather than hidden in Worker code
- M1 successful path remains valid

Reason for first position:

Growth and balance cannot be evaluated meaningfully until the downside of an expedition is represented.

---

### CP-21 — Growth / progression model

Primary mapping:

- W1-006 Growth model
- PlayerCore progression fields

Deliverables:

- EXP-to-level/progression rule
- deterministic progression application
- level/stat growth boundary
- maximum/minimum and overflow guards
- progression preview fields where required

Acceptance:

- repeated claims advance progression deterministically
- level/stat changes survive snapshot serialization
- stale/retried claims cannot apply progression twice
- progression remains independent of D1/Worker runtime

Reason for position:

M2 needs a loop whose rewards change future player state rather than only accumulate counters/items.

---

### CP-22 — Rarity and multi-zone reward model

Primary mapping:

- W1-003 risk/reward
- W1-004 seeded resolution
- exact rarity policy currently deferred
- W3-004 zone catalog

Deliverables:

- rarity weights for the existing seven rarity labels or an explicitly reduced M2 subset
- at least two materially different expedition choices
- zone/duration reward tables
- rarity-bearing item definitions
- reward/risk preview derived from the same authoritative configuration used by resolution

Acceptance:

- preview and actual resolver share one configuration source
- deterministic seeds reproduce rarity/drop results
- different expedition choices produce measurably different risk/reward distributions
- item rarity is persisted and rendered without breaking M1 payload budgets

Open decision:

Whether all seven rarities (Common / Uncommon / Rare / Epic / Legend / Mythic / Phantasm) enter M2 or only a subset.

---

### CP-23 — Equipment effects feed back into exploration

Primary mapping:

- equipment domain
- E-002 resolved character stats
- E-003 resolution

Deliverables:

- minimum stat/effect vocabulary
- equipped item effects included in the exploration-start character snapshot
- resolver consumes the frozen start snapshot, not mutable live equipment
- item changes affect subsequent expeditions only

Acceptance:

- equipping an item can change a future expedition's deterministic outcome or reward parameters
- changing equipment after expedition start cannot rewrite that expedition
- claim/equip concurrency guarantees from CP-18 remain valid

Reason for position:

This closes the gameplay feedback loop: drops become useful inputs rather than inventory-only collectibles.

---

### CP-24 — Balance simulation harness

Primary mapping:

- W5-007 formal balance simulation

Deliverables:

- seeded batch simulation over zone/duration/player/equipment combinations
- aggregate success/failure rate
- Gold/EXP expected value
- drop/rarity frequency
- progression-rate metrics
- machine-readable output suitable for regression comparison

Acceptance:

- fixed seed set is reproducible
- simulation uses production game-core resolution functions
- no network/D1 dependency
- obvious economy/progression regressions can fail a test or budget guard

Important:

Numbers produced before tuning are measurements, not accepted balance targets.

---

### CP-25 — M2 API/UI integration

Primary mapping:

- W3 API contracts
- W4 mobile UI
- W4-008 compact number formatting

Deliverables:

- risk preview in destination/duration selection
- success/failure result presentation
- progression/level presentation
- rarity presentation
- equipment-effect presentation
- authoritative reconciliation after claim/equip

Acceptance:

- the complete M2 solo loop is playable from the existing low-bandwidth mobile shell
- no authoritative calculation moves to the client
- CP-13 payload/bundle guardrails remain active

---

### CP-26 — M2 concurrency / migration regression

Primary mapping:

- W5 validation
- C-003 serialization/schemaVersion hook if M2 changes snapshots
- C-004 integrity validation

Deliverables:

- snapshot migration/round-trip tests for any M2 schema change
- claim/equip/progression retry tests
- failure-path atomicity tests
- stale-version regression tests
- existing M1 real-D1 acceptance retained

Acceptance:

- old supported M1 snapshots migrate or are explicitly rejected by version policy
- no partial progression/reward/loss commit
- duplicate/retried requests remain exactly-once where required
- M1 acceptance stays green

---

### CP-27 — Full M2 acceptance loop

Required end-to-end loop:

```text
bootstrap
→ compare at least two expedition choices
→ inspect risk/reward preview
→ start with frozen equipment/stats
→ resolve success or failure
→ claim atomically
→ apply reward/loss + progression
→ inspect rarity-bearing inventory
→ equip an item
→ start again with changed effective stats
```

Additional acceptance:

- deterministic seeded resolution
- progression cannot double-apply
- equipment cannot retroactively alter an active expedition
- snapshot migration/integrity tests pass
- balance simulation runs reproducibly
- payload/snapshot/web bundle guardrails pass
- game-core remains runtime-independent

CP-27 completion would satisfy the proposed M2 Solo Progression Slice.

## Parallel / post-M2 workstreams

These are intentionally not placed on the proposed gameplay critical path:

### Account and archive

- OIDC account linking
- X1-001 Google appDataFolder integration
- X1-002 archive export
- X1-003 retry/sync
- X1-004 archive compaction
- X1-005 retention evaluation

Dependency note:

Remote per-user archive synchronization should be designed together with the account/linking identity model rather than inserted into the gameplay CP independently.

### Monetization

- standard ads
- ad metrics
- rewarded ads
- billing/MoR
- entitlement
- premium currency
- AI monetization

### Social / later gameplay

- Party
- Caravan
- AI features

These can become separate milestones after the solo progression/economy contracts are stable.

## Proposed ordering

```text
M1 / CP-19 complete
↓
CP-20 Failure/drop-loss contract
↓
CP-21 Growth/progression
↓
CP-22 Rarity + multi-zone reward model
↓
CP-23 Equipment effects → exploration
↓
CP-24 Balance simulation harness
↓
CP-25 M2 API/UI integration
↓
CP-26 Migration/concurrency regression
↓
CP-27 Full M2 acceptance
↓
M2 Solo Progression Slice
```

## Decisions required before implementation

1. Accept or change the M2 objective: solo progression depth before account/archive/monetization.
2. Decide whether M2 uses all seven rarity levels or a reduced subset.
3. Define the intended failure consequence at product level:
   - reward reduction only
   - newly acquired drop loss
   - carried/equipped item risk
   - another explicit rule
4. Decide whether M2 requires multiple zones, multiple durations, or both as the primary risk/reward choice dimension.
5. Decide whether Google appDataFolder/OIDC should remain parallel/post-M2 or become an M2 release requirement.

Until these are fixed, CP-20 through CP-27 are a proposed plan rather than an accepted implementation sequence.
