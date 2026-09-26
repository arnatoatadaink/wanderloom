# CP-35 Full M3 Acceptance — 2026-09-26

## Status

**Accepted / Complete**

## Position

```text
CP-28 Balance Measurement Baseline            ✅
CP-29 Production Contract Hardening            ✅
CP-30 Guest -> Linked Account Domain            ✅
CP-31 Google OIDC Integration                   ✅
CP-32 Archive Export Contract                   ✅
CP-33 appDataFolder Sync + Retry                ✅
CP-34 Persistence / Identity Concurrency        ✅
CP-35 Full M3 Acceptance                        ✅ Accepted
```

Milestone:

**M3 — Productionized Persistent Solo Slice**

## Acceptance scope

CP-35 validates M3 as one coherent release boundary rather than as isolated CPs.

M3 preserves the M2 solo gameplay loop while adding:

- guest -> linked Google identity continuity
- Google restore
- long-term archive export contract
- Google Drive appDataFolder delivery
- encrypted refresh-token persistence
- retry/idempotency behavior
- persistence and identity concurrency safety

D1 remains gameplay-authoritative.

## Full-M3 automated scenario

`workers/api/src/cp35-full-m3-acceptance.integration.test.ts`

Real-D1 scenario:

```text
guest bootstrap
  -> Google link
  -> Google restore
  -> start exploration
  -> claim rewards
  -> recent archive = pending
  -> archive delivery
  -> export state = synced
  -> recent archive = synced
```

The scenario verifies that one PlayerId survives identity restore, gameplay, claim and archive delivery, and that the M3 persistence schema including CP-34 delivery leases is available.

## Final automated validation

Observed local result:

```text
Web         16 PASS
game-core   65 PASS
Worker      59 PASS
----------------
Total      140 PASS
```

Additional validation:

- workspace typecheck: PASS
- Web production build: PASS
- game-core build: PASS
- Worker Wrangler dry-run: PASS
- git diff check: clean
- only expected `workers/api/.wrangler/` local runtime state untracked
- no OAuth secrets, refresh tokens, access tokens or encryption keys committed

## Migration acceptance

Local D1 migration check reports:

```text
No migrations to apply
```

Therefore the current local database is already at the complete migration baseline through:

```text
0001 ... 0005
```

CP-34 validation separately confirmed the delivery lease columns and compatibility of existing synced archive rows.

## Final browser acceptance

Final manual smoke passed after the CP-35 Web-state fix.

Accepted observations:

1. Google restore succeeds.
2. After restore, `Start expedition` is usable without a page reload.
3. Exploration starts normally.
4. Claim transitions to the Result screen without a page reload.
5. Gold / EXP / inventory remain correct.
6. Closing the Google Drive authorization popup no longer sends the entire game to `CONNECTION / STATE ERROR`.
7. The game screen remains usable and reports the Drive-specific failure.
8. Retrying Drive authorization succeeds.
9. Archive sync reports zero failures.
10. A new exploration can be started after archive synchronization.

## CP-35 defect discovered and resolved

Manual acceptance exposed two Web-state UX defects:

- restored state inherited `busy=true`, leaving the ready screen rendered as `Starting…`
- Drive popup cancellation was treated as a global application failure

Resolved independently in:

```text
38dbefcf0307c3a797e79f6932a953c416ed7a11
fix(web): clear restore busy state and isolate Drive popup failures
```

The fixes were revalidated by automated tests/builds and final browser smoke.

## Existing acceptance evidence retained

### M2 gameplay

CP-27 continues to cover:

- zone/duration choice
- exploration start
- reward claim
- rarity drop
- equipment
- effective-stat change
- subsequent exploration

### Identity

CP-31 covers link persistence, idempotent relink, identity/provider conflicts, restore and invalid credentials.

CP-34 adds concurrent identity-link convergence.

### Archive

CP-33 covers retry, authorization renewal and confirmed delivery semantics.

Real Google local acceptance established Google OAuth authorization, encrypted refresh-token storage, appDataFolder writes, repeat sync and gameplay continuity.

### Concurrency

CP-34 covers archive delivery serialization and expired-lease recovery.

Earlier gameplay mutation concurrency coverage remains green.

## Deferred design improvement

Persistent Google/Drive connection-state UX is intentionally **not** reopening M3.

The future design is documented separately in:

`docs/wbs/POST_M3_GOOGLE_IDENTITY_DRIVE_PERSISTENCE_UX_PLAN_2026-09-26.md`

This includes connection-status discovery, avoiding unnecessary Drive consent popups, reauthorization classification and eventual best-effort automatic archive sync.

It is a Post-M3 WBS/CP item and should be scheduled with other subsequent product work.

## Final result

All CP-35 exit criteria are satisfied.

**CP-35 Accepted / Complete.**

**M3 Productionized Persistent Solo Slice is ready to be merged and closed.**
