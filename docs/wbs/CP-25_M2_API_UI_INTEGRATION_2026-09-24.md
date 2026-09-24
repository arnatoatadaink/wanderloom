# CP-25 M2 API / UI Integration — Validation — 2026-09-24

## Status

**Accepted / Complete**

CP-25 connects the M2 progression slice to the existing Worker API and low-bandwidth Web shell while keeping game-rule authority on the server.

## Accepted implementation

- `GET /api/zones` exposes M2 risk preview metadata.
- Failure probability remains separate from loss-policy consequences.
- Zone preview exposes configured reachable rarities.
- Web DTOs preserve risk and rarity preview metadata.
- Web ready-state rendering displays failure probability, retained Gold/EXP ratios, generated-drop loss behavior, and possible rarity labels.
- Default claim resolution uses the M2 seeded failure resolver.
- Default claim resolution uses deterministic rarity/drop generation.
- Claimed retained EXP is routed through the CP-21 progression rule.
- Exploration start can freeze inventory/equipment-derived character state through the CP-23 boundary.
- Existing optional `progressionRule` callers remain compatible under `exactOptionalPropertyTypes`.
- CP-25-specific API and Web regression tests cover the preview metadata boundary.

## Scope boundary

The current runtime values remain provisional M2 smoke configuration. CP-25 integrates the contract; it does not adopt final production balance values.

No production deployment, OIDC, appDataFolder synchronization, monetization, Party, Caravan, or AI feature is introduced by this checkpoint.

## Local acceptance evidence

User-reported WSL validation on 2026-09-24:

- `pnpm -r typecheck`: PASS across game-core / web / Worker.
- `pnpm -r test`: PASS.
  - game-core: 16 files / 47 tests.
  - web: 3 files / 10 tests.
  - Worker: 8 files / 21 tests.
  - total: **78 tests**.
- `pnpm -r build`: PASS.
  - Web: production Vite build PASS.
  - game-core: TypeScript build PASS.
  - Worker: Wrangler dry-run build PASS.
- Web bundle:
  - JS: 15.95 kB raw / 4.55 kB gzip.
  - CSS: 4.09 kB raw / 1.53 kB gzip.
  - HTML: 0.39 kB raw / 0.26 kB gzip.
- Worker dry-run upload: 44.37 KiB raw / 8.67 KiB gzip.
- `git diff --check`: clean.

## Local working-tree note

`workers/api/.wrangler/` was reported as an untracked local runtime directory. It is not part of the CP-25 source change and is not accepted as repository content.

## Exit

CP-25 is accepted. Integration target is `m2`.

The next critical-path item is **CP-26 Migration / Concurrency Regression**.
