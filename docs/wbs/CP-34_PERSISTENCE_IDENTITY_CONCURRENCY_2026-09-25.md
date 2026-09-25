# CP-34 Persistence / Identity Concurrency — 2026-09-25

## Status

**Accepted / Complete**

## Position

```text
CP-33 appDataFolder Sync + Retry          ✅ Accepted / merged to m3
CP-34 Persistence / Identity Concurrency  ✅ Accepted / Complete
CP-35 Full M3 Acceptance                  ⏳ Next
```

Branch:

`feat/cp-34-persistence-identity-concurrency`

## Objective

Harden the persistence and identity paths introduced in CP-30 through CP-33
against concurrent requests and partial persistence.

The target is not to redesign M2 gameplay concurrency already covered by
CP-18. CP-34 focuses on the new production persistence surfaces:

- external identity linking
- archive delivery ownership
- archive success acknowledgement

## Changes

### 1. Concurrent external identity reconciliation

`linkGoogleAccount()` now treats the D1 unique constraints as the final
authority.

The service still performs the normal provider-independent account-linking
decision first. If another request wins the race between that read and the
insert, the losing request re-reads the authoritative identity rows and
returns the stable domain outcome instead of leaking the SQLite constraint
exception as HTTP 500.

Expected convergence:

```text
same subject + different players
  -> one linked
  -> one external_identity_conflict

same subject + same player
  -> one linked
  -> one already_linked
```

### 2. Atomic archive success acknowledgement

The archive success path now writes:

- `archive_export_state`
- `recent_archive`

inside one D1 `batch()` transaction boundary.

This prevents a partial state where a Drive `remote_id` is persisted while
the corresponding recent archive remains pending.

### 3. Archive delivery lease

Migration:

`0005_archive_export_delivery_lease.sql`

adds:

- `delivery_lease_token`
- `delivery_lease_until`

to `archive_export_state`.

Before calling the external archive sink, a sync request must acquire the D1
lease for that exact player/exploration archive.

Properties:

- only one request may own an unexpired lease
- a second concurrent sync skips external delivery
- lease expires after 60 seconds
- failure clears the owned lease
- success clears the owned lease
- thrown provider/network exceptions release the owned lease before bubbling
- an expired lease can be reacquired

This reduces the appDataFolder preflight-search/create race to a single
application delivery owner per archive.

### 4. Existing CP-33 compatibility

CP-33 retry semantics remain:

- provider failure keeps archive pending
- retryable failures can retry
- authorization renewal can reopen eligible Drive 403 failures
- confirmed remote success marks archive synced
- already-synced archives are not delivered again

## Real-D1 concurrency coverage

New integration suite:

`workers/api/src/cp34-persistence-identity-concurrency.integration.test.ts`

Covers:

1. two players concurrently linking the same Google subject
2. one player concurrently linking the same Google subject twice
3. two concurrent archive sync requests for the same pending archive

Expected archive result:

```text
sync A acquires lease -> sink called once
sync B fails lease acquisition -> no sink call
sync A succeeds -> archive synced, lease cleared
```

## Existing concurrency coverage retained

Earlier coverage remains authoritative for gameplay mutations:

- CP-18 claim/equipment race
- duplicate claim convergence
- version conflict handling
- atomic claim mutation guard

CP-34 does not replace those contracts.

## Local validation

Run:

```bash
git pull --ff-only
pnpm -r typecheck
pnpm -r test
pnpm -r build
git diff --check
git status --short
```

Expected migration addition:

`workers/api/migrations/0005_archive_export_delivery_lease.sql`

The exact final test count should be taken from the local run.

## Local migration validation

After automated validation passes:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 migrations apply wanderloom-local --local
```

Then:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "
PRAGMA table_info(archive_export_state);
"
```

Verify:

- `delivery_lease_token`
- `delivery_lease_until`

## CP-34 exit criteria

- concurrent same-subject/different-player link returns one stable conflict, not 500
- concurrent same-player link converges idempotently
- archive success acknowledgement cannot be partially persisted
- simultaneous sync requests invoke the external sink once per archive
- expired delivery lease can recover
- CP-18 gameplay concurrency regressions remain green
- CP-33 archive retry and real-D1 regressions remain green
- workspace typecheck/test/build/diff-check green

After acceptance:

**CP-35 Full M3 Acceptance**


## Acceptance evidence

Local validation completed successfully after the concurrency hardening changes.

### Automated validation

```text
Web         16 PASS
game-core   65 PASS
Worker      58 PASS
----------------
Total      139 PASS
```

- workspace typecheck: PASS
- workspace tests: PASS
- Web production build: PASS
- game-core build: PASS
- Worker Wrangler dry-run: PASS
- git diff check: clean
- only expected local `workers/api/.wrangler/` runtime state remains untracked

The CP-34 Worker integration suite passed all four cases:

1. concurrent same Google subject across two players -> one owner + one stable conflict
2. concurrent idempotent link for one player -> linked/already_linked convergence
3. concurrent archive sync -> one sink delivery under D1 lease
4. expired delivery lease -> successful lease recovery

### Migration acceptance

Applied locally:

```text
0005_archive_export_delivery_lease.sql ✅
```

`archive_export_state` now contains:

- `delivery_lease_token`
- `delivery_lease_until`

Existing synced archive rows preserved their:

- non-null `remote_id`
- non-null `synced_at`
- previous attempt counts

and both new lease columns are NULL on idle synced rows.

This confirms the migration is backward-compatible with CP-33 local data.

## Final CP-34 status

CP-34 exit criteria are satisfied:

- concurrent identity link conflicts return stable domain outcomes instead of storage 500s ✅
- same-player concurrent linking converges idempotently ✅
- archive success acknowledgement is atomic across export state and recent archive ✅
- concurrent archive sync invokes the external sink once per archive lease window ✅
- expired delivery leases recover ✅
- CP-18 gameplay concurrency regressions remain green ✅
- CP-33 retry/archive regressions remain green ✅
- migration 0005 applies cleanly to existing local data ✅
- typecheck/test/build/diff-check all green ✅

**CP-34 Accepted / Complete.**

Next:

**CP-35 Full M3 Acceptance**
