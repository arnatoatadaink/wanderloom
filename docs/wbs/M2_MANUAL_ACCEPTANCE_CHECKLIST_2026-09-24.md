# M2 Manual Acceptance Checklist — 2026-09-24

## Status

**Accepted / PASS**

Manual acceptance completed on 2026-09-24 against `m2` commit
`417365c6476622936f56c4e9d42df5293e62d1b8` using the local Worker, Web app,
and reused local D1 state.

This checklist validates visible behavior and user-operable flow after M2 closure. It does **not** approve production balance values.

---

## 0. Preconditions

### Environment

- [x] Local source is synchronized with `m2`.
- [x] No unintended source diff exists before acceptance.
- [x] Worker API starts successfully.
- [x] Web app starts successfully.
- [x] Browser can reach the local Web app.
- [x] Browser can reach the local Worker API through the configured development route.
- [x] Local D1 database is initialized with current migrations.

### Recommended evidence

Record before starting:

```text
Date:
Commit SHA:
Web URL:
Worker URL:
Browser:
D1 reset/reused:
Tester:
```

---

## 1. Initial bootstrap / ready state

### Procedure

1. Open Wanderloom in a clean browser session or reset the local guest state.
2. Complete or bypass the local tutorial according to the current v0.0.1 flow.
3. Reach the main ready state.

### Expected result

- [ ] Guest bootstrap succeeds.
- [ ] No blocking error is displayed.
- [ ] Current Level / EXP / Gold are visible.
- [ ] Inventory state is visible or reachable.
- [ ] No active exploration is reported.
- [ ] Main exploration controls are usable.

### Record

```text
PASS / FAIL:
Observed Level:
Observed EXP:
Observed Gold:
Notes:
```

---

## 2. Expedition choice catalog

### Procedure

Inspect the available exploration choices before starting an expedition.

### Expected result

- [ ] More than one zone is available.
- [ ] `M1 Smoke Frontier` is visible.
- [ ] `Moss Hollow` is visible.
- [ ] A short duration is available.
- [ ] A long duration is available.
- [ ] Changing zone/duration changes the selected expedition choice without page failure.

### Notes

The current names and timings are provisional smoke configuration. Their presence and operability are under test; their gameplay quality is not.

### Record

```text
PASS / FAIL:
Zones observed:
Durations observed:
Notes:
```

---

## 3. Risk / reward / rarity preview

### Procedure

Inspect at least two different zone/duration choices.

### Expected result

For the selected choice, the UI exposes:

- [ ] Gold reward preview.
- [ ] EXP reward preview.
- [ ] Drop-count preview.
- [ ] Failure probability.
- [ ] Failure Gold retention policy.
- [ ] Failure EXP retention policy.
- [ ] Whether generated drops are lost on failure.
- [ ] Reachable rarity labels.

### Important acceptance boundary

- [ ] Risk probability and failure consequence are presented as separate concepts.
- [ ] The preview changes consistently when another configured choice is selected.
- [ ] No production-balance judgment is made from this test.

### Record

```text
PASS / FAIL:
Choice A:
Choice B:
Observed failure probability:
Observed rarity labels:
Notes:
```

---

## 4. First exploration start

### Procedure

1. Select one zone and duration.
2. Start the exploration.

### Expected result

- [ ] Start action succeeds.
- [ ] UI enters exploring state.
- [ ] Active zone is visible.
- [ ] Active duration is visible.
- [ ] End time and/or remaining time is visible.
- [ ] Effective stats are visible.
- [ ] With no relevant equipment active, the effective state is the base/unmodified state.
- [ ] Navigation/re-render does not duplicate the exploration.

### Record

```text
PASS / FAIL:
Zone:
Duration:
Start time:
End time:
Effective stats:
Notes:
```

---

## 5. Frozen exploration state

### Procedure

While the first expedition is active, inspect the displayed effective state.

If the current UI permits equipment mutation during an active expedition, change equipment only for this check. Otherwise, verify only the displayed frozen snapshot and defer mutation comparison to the second expedition.

### Expected result

- [ ] The active exploration has its own effective-stat snapshot.
- [ ] The snapshot remains stable for that exploration.
- [ ] Later inventory/equipment state does not retroactively rewrite the already-started expedition.

### Record

```text
PASS / FAIL / NOT DIRECTLY OBSERVABLE:
Initial effective stats:
Later observed effective stats:
Notes:
```

---

## 6. Claim transition

### Procedure

1. Wait until the expedition becomes claimable.
2. Trigger Claim once.

### Expected result

- [ ] Exploring state transitions to claimable/result state.
- [ ] Claim succeeds once.
- [ ] Active exploration clears after the successful claim.
- [ ] Result reports either `success` or `failure`.
- [ ] Gold / EXP state updates according to the returned result.
- [ ] UI does not remain permanently stuck in claimable state.

### Record

```text
PASS / FAIL:
Result:
Gold before:
Gold after:
EXP before:
EXP after:
Level before:
Level after:
Notes:
```

---

## 7A. Success-path item / rarity verification

Perform this section when the manual run produces a retained item.

If the first run fails or yields no retained item, repeat an expedition until a retained item is available. Do not classify repeated attempts as a balance test.

### Expected result

- [ ] Newly acquired item appears in inventory.
- [ ] Item definition/name is visible.
- [ ] Item rarity is visible.
- [ ] Rarity remains present after normal UI refresh/state reload.
- [ ] Existing inventory items are not unintentionally removed.

### Record

```text
PASS / FAIL / NOT REACHED:
Item:
Rarity:
Inventory version/state:
Notes:
```

---

## 7B. Failure-path verification

Perform this section when a failure result is observed.

A manual run does not have to force failure if the current seed does not produce one; CP-26 automated real-D1 tests already cover deterministic failure atomicity. This section is supplemental visual confirmation.

### Expected result

- [ ] Result is visibly distinguishable as failure.
- [ ] Retained Gold is applied rather than blindly applying the full generated amount.
- [ ] Retained EXP is applied rather than blindly applying the full generated amount.
- [ ] Generated drops are not retained when the configured policy says they are lost.
- [ ] Previously owned/equipped items remain intact.

### Record

```text
PASS / FAIL / NOT REACHED:
Observed result:
Gold change:
EXP change:
Drop behavior:
Notes:
```

---

## 8. Progression verification

### Procedure

Compare Level / EXP before and after one or more successful or failed claims.

### Expected result

- [ ] Retained EXP is reflected in progression.
- [ ] Level increases when the configured threshold is crossed.
- [ ] EXP does not visibly apply twice for one claim.
- [ ] Refresh/reload does not revert the persisted progression.

### Record

```text
PASS / FAIL:
Level before:
EXP before:
Level after:
EXP after:
Notes:
```

---

## 9. Equip acquired item

### Procedure

1. Select a retained inventory item that is valid for the available equipment slot.
2. Equip it.

### Expected result

- [ ] Equip action succeeds.
- [ ] Equipped slot references the chosen item.
- [ ] Inventory remains intact.
- [ ] Repeating the same equip action does not corrupt state.
- [ ] UI reflects the equipped state.

### Record

```text
PASS / FAIL:
Equipped item:
Rarity:
Slot:
Notes:
```

---

## 10. Second exploration with equipment effect

### Procedure

1. Keep the acquired item equipped.
2. Start another exploration.
3. Inspect the newly frozen effective stats.

### Expected result

- [ ] Second exploration starts successfully.
- [ ] A new exploration instance is created.
- [ ] Effective stats differ from the unequipped/base first expedition when the equipped item has configured modifiers.
- [ ] Frozen equipment-effect information is visible where supported by the current UI.
- [ ] The equipped item remains in inventory.
- [ ] The equipped item is not consumed merely by starting the expedition.

### Primary M2 visual acceptance point

A typical expected transition is:

```text
First exploration:
Effective stats = Base

Acquire rarity item
→ Equip

Second exploration:
Effective stats = base + equipped modifiers
```

### Record

```text
PASS / FAIL:
First exploration stats:
Equipped item:
Second exploration stats:
Observed delta:
Notes:
```

---

## 11. Persistence / refresh smoke check

### Procedure

Refresh the browser during a stable state, preferably:

- after a claim, and
- during the second active exploration.

### Expected result

- [ ] Player identity remains usable for the local guest session.
- [ ] Gold / EXP / Level remain consistent.
- [ ] Inventory remains consistent.
- [ ] Equipped item remains equipped.
- [ ] Active exploration reloads correctly when one exists.
- [ ] Effective frozen exploration stats remain consistent after reload.
- [ ] No duplicate reward is created by refresh.

### Record

```text
PASS / FAIL:
Refresh point:
Observed state before:
Observed state after:
Notes:
```

---

## 12. Duplicate-action sanity checks

These checks are optional for UI-only acceptance because automated real-D1 coverage already exists, but perform them if the UI permits.

### Claim retry

- [ ] Repeating an already completed Claim does not award Gold/EXP/items again.
- [ ] UI reports or resolves the already-claimed state without corrupting the session.

### Equip retry

- [ ] Repeating the same Equip does not duplicate or remove the item.
- [ ] Equipment state remains stable.

### Record

```text
PASS / FAIL / NOT TESTED:
Claim retry:
Equip retry:
Notes:
```

---

## 13. Low-bandwidth / basic presentation check

This is not a full performance benchmark.

### Expected result

- [ ] Initial UI remains simple and usable.
- [ ] Zone/risk/rarity additions do not make the primary exploration action unclear.
- [ ] No large media asset is required for the core M2 loop.
- [ ] Main controls remain usable at narrow/mobile-like viewport width.
- [ ] No obvious layout overflow blocks Start / Claim / Equip.

### Record

```text
PASS / FAIL:
Viewport used:
Notes:
```

---

## 14. Final acceptance summary

### Required M2 manual-pass conditions

The manual acceptance is considered complete when all of the following have been visually confirmed:

- [x] Multiple zone/duration choices are usable.
- [x] Risk/reward/rarity preview is visible.
- [x] Exploration can start and complete.
- [x] Claim updates persistent progression/reward state.
- [x] A retained item can preserve visible rarity.
- [x] A retained item can be equipped.
- [x] A later exploration reflects equipped stat modifiers in its frozen effective stats.
- [x] Refresh does not visibly corrupt persisted state.
- [x] No blocking UI/runtime error prevents another expedition.

Failure-path visual confirmation is desirable but is **not mandatory** if a failure seed is not encountered manually, because CP-26 automated real-D1 acceptance already covers the failure/progression/retry path.

### Final record

```text
Overall: PASS

Commit: 417365c6476622936f56c4e9d42df5293e62d1b8
Date: 2026-09-24
Tester: User manual browser verification + Codex local runtime/API verification

Blocking defects:
- None.

Non-blocking observations:
- Uncommon rarity was observed.
- Zone 1 and Zone 2 both allowed 5-minute and 10-minute selections.
- Start, Claim, and Equip remained operable at a narrow viewport width.
- Failure behavior and the equipped-item Effective stats change were visually confirmed.

Balance observations (do not treat as M2 defects):
- All four zone/duration selections currently show 25% failure probability,
  50% Gold retention, 50% EXP retention, and generated-drop loss on failure.
- Reachable item rarity is the observed differentiator between the provisional choices.

Follow-up candidates:
- Revisit per-zone/per-duration risk and reward differentiation during production balance tuning.
```

---

## Out of scope for this checklist

Do not fail M2 manual acceptance solely because of the following:

- production balance quality
- final rarity rates
- final zone naming/content
- final expedition durations
- final Gold/EXP curve
- final equipment stat values
- OIDC/account linking
- Google appDataFolder archive sync
- monetization
- Party / Caravan
- AI features
- loss of already-owned/equipped equipment

Those remain post-M2 work.
