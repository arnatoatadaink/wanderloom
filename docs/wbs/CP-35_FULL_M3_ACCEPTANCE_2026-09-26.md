# CP-35 Full M3 Acceptance — 2026-09-26

## Status

**Ready for local validation**

## Position

```text
CP-28 Balance Measurement Baseline            ✅
CP-29 Production Contract Hardening            ✅
CP-30 Guest -> Linked Account Domain            ✅
CP-31 Google OIDC Integration                   ✅
CP-32 Archive Export Contract                   ✅
CP-33 appDataFolder Sync + Retry                ✅
CP-34 Persistence / Identity Concurrency        ✅
CP-35 Full M3 Acceptance                        🚧 In progress
```

Target milestone:

**M3 — Productionized Persistent Solo Slice**

## Objective

Validate M3 as one coherent release boundary rather than as isolated CPs.

M3 must preserve the M2 solo gameplay loop while adding:

- guest -> linked Google identity continuity
- Google restore
- long-term archive export contract
- Google Drive appDataFolder delivery
- encrypted refresh-token persistence
- retry/idempotency behavior
- persistence and identity concurrency safety

D1 remains gameplay-authoritative.

## New full-M3 automated scenario

Added:

`workers/api/src/cp35-full-m3-acceptance.integration.test.ts`

The real-D1 scenario executes:

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

It also verifies:

- the same PlayerId survives guest -> linked -> restored identity
- claim rewards remain valid
- archive export identity is stable
- delivery lease is cleared after success
- migrations expose the M3 persistence tables
- `archive_export_state` contains CP-34 lease columns

The test runs through the full local migration chain supplied by
`TEST_MIGRATIONS`, currently migrations 0001 through 0005.

## Existing evidence incorporated into CP-35

### M2 gameplay

CP-27 full M2 acceptance remains green and covers:

- zone/duration choice
- exploration start
- reward claim
- rarity drop
- equipment
- effective-stat change
- next exploration

### Identity

CP-31 covers:

- Google link persistence
- idempotent relink
- external identity conflict
- provider conflict
- restore without guest header
- invalid credential rejection

CP-34 additionally covers concurrent identity linking.

### Archive

CP-33 covers:

- provider failure leaves archive pending
- retry succeeds
- authorization renewal reopens eligible Drive 403 failure
- confirmed delivery moves archive to synced

Real Google local acceptance already proved:

- real Google OAuth authorization
- encrypted refresh-token storage
- real appDataFolder writes
- repeat sync with no duplicate logical archive
- post-sync gameplay continuity

CP-35 does not require intentionally repeating destructive/error-injection
Google consent testing unless a regression is observed.

### Concurrency

CP-34 covers:

- same Google subject / different players
- same player / same Google subject
- simultaneous archive sync serialization
- expired lease recovery

CP-18 continues to cover M2 claim/equipment mutation races.

## Automated validation

From the CP-35 branch run:

```bash
git pull --ff-only
pnpm -r typecheck
pnpm -r test
pnpm -r build
git diff --check
git status --short
```

Expected test baseline after the new CP-35 integration test:

```text
Web         16
game-core   65
Worker      59
----------------
Total      140
```

The exact observed count is authoritative.

Expected untracked local runtime state:

`workers/api/.wrangler/`

No OAuth secrets, refresh tokens, access tokens, or encryption keys may appear
in Git status/diff.

## Migration validation

The local D1 used for CP-33/34 already has migrations 0001 through 0005.

Confirm:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 migrations list wanderloom-local --local
```

All current migrations should be applied.

Optional schema evidence:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'players',
    'external_identity_links',
    'recent_archive',
    'archive_export_state',
    'google_drive_authorizations'
  )
ORDER BY name;
"
```

## Final browser smoke

Run Worker and Web with the same local configuration already accepted in CP-33.

Worker:

```bash
pnpm --filter @wanderloom/api dev
```

Web:

```bash
pnpm --filter @wanderloom/web exec vite --host 0.0.0.0
```

Use the registered origin, normally:

`http://localhost:5173`

Perform one short smoke sequence:

1. restore the existing Google-linked player
2. confirm normal exploration screen loads
3. start one exploration
4. claim it normally
5. verify no identity/archive error blocks gameplay
6. run **Enable Drive archive**
7. confirm sync reports zero failures

No need to expose or copy secrets during this acceptance.

## CP-35 exit criteria

CP-35 may be Accepted when:

- full workspace typecheck passes
- all workspace tests pass
- CP-35 full-M3 real-D1 integration passes
- production builds/dry-run pass
- migration chain 0001-0005 is applied/compatible
- CP-27 M2 gameplay acceptance remains green
- CP-31 identity acceptance remains green
- CP-33 archive retry acceptance remains green
- CP-34 concurrency acceptance remains green
- final browser restore/gameplay/archive smoke has no blocking defect
- no sensitive OAuth/archive credential material is committed

## Release boundary after acceptance

After CP-35 acceptance:

1. merge CP-35 to `m3`
2. mark M3 **Productionized Persistent Solo Slice** complete
3. prepare the M3 release baseline/tag according to the repository's release
   convention
4. derive the Post-M3 WBS from remaining product work rather than extending
   the M3 critical path
