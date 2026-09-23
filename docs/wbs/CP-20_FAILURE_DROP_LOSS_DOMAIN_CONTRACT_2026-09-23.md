# CP-20 Failure / Drop-loss Domain Contract — Validation — 2026-09-23

## Status

**Accepted / Complete**

CP-20 establishes the M2 game-core boundary for deterministic expedition failure and explicit reward/drop loss without introducing Worker, D1, or Web coupling.

## Accepted implementation

- `ExpeditionOutcome = "success" | "failure"`
- explicit `LossPolicy` for Gold/EXP retention and generated-drop retention
- separate success/failure reward resolution with retained/lost values
- `ExpeditionRiskPreview` keeps failure probability separate from failure consequence
- seeded M2 resolver incorporates seed + exploration + zone + duration
- resolver configuration supplies failure probability and loss policy
- existing M1 `resolveSeededM1Exploration` success-only behavior remains intact
- existing inventory/equipment is outside the M2 loss contract

## Determinism boundary

For the CP-20 resolver, identical:

```text
seed
+ explorationId
+ zoneId
+ durationId
+ resolver configuration
```

produces identical outcome and reward/loss resolution.

Character/equipment snapshot effects are intentionally not introduced here; they enter the resolver boundary in CP-23.

## Local acceptance evidence

User-reported WSL validation on 2026-09-23:

- `pnpm -r typecheck`: PASS across game-core / web / Worker
- `pnpm -r test`: PASS
  - game-core: 12 files / 30 tests
  - web: 3 files / 9 tests
  - Worker: 8 files / 21 tests
  - total: 60 tests
- `git diff --check`: clean

## Scope exclusions retained

- no Worker integration
- no D1/schema change
- no Web/UI change
- no fixed production balance percentage
- no loss of previously owned/equipped items
- no OIDC/appDataFolder dependency

## Exit

CP-20 is accepted. The next critical-path item is **CP-21 Growth / Progression Model**.
