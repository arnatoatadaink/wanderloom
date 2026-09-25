# CP-32 Archive Export Contract — 2026-09-25

## Status

**Accepted / Complete — 2026-09-25**

## Objective

Define the provider-independent long-term archive export contract that CP-33 will bind to Google Drive `appDataFolder`.

CP-32 does not perform any external write. It defines the immutable payload, stable identity, retry lifecycle, compatibility boundary, and sink interface.

## Authority boundary

D1 remains gameplay-authoritative.

The exported archive is historical/long-term data only.

An archive export:

- must never decide whether gameplay rewards were accepted
- must never roll back a committed claim
- must not become the source of truth for active core/inventory state
- may be retried asynchronously after the gameplay mutation has already committed

## Export envelope

Version 1 uses:

- `kind = "wanderloom.exploration_archive"`
- `exportVersion = 1`
- stable `archiveId`
- stable `idempotencyKey`
- immutable historical `record`

The record contains:

- source archive schema version
- player ID
- exploration ID
- zone / duration
- started / ended / claimed timestamps
- outcome
- rewards
- summary metrics

Mutable D1 sync metadata is intentionally excluded.

## Immutable archive identity

For one exploration archive record:

```text
archiveId =
  exploration:<playerId>:<explorationId>
```

This identity is independent from any Google Drive file ID.

## Idempotency key

Version 1:

```text
wanderloom:archive:v1:<playerId>:<explorationId>
```

The same logical archive entry always produces the same key, even if its D1 sync state changes from pending to synced.

CP-33 adapters must use this key to converge retries/duplicate delivery onto one logical remote record.

## Compatibility rule

`parseArchiveExport()` accepts only the explicitly supported envelope version.

Current behavior:

- v1 valid envelope → accepted
- unknown future version → rejected
- malformed required fields → rejected
- archiveId/idempotencyKey inconsistent with record identity → rejected

A future v2 must be added deliberately rather than silently interpreted as v1.

## Export lifecycle contract

Provider-independent lifecycle states:

### pending

No confirmed remote write yet.

Tracks:

- last attempt timestamp or null
- attempt count

### error

The most recent delivery failed.

Tracks:

- last attempt timestamp
- attempt count
- retryable flag
- stable error code

A retryable error may later transition to synced.

### synced

Remote write is confirmed.

Tracks:

- synced timestamp
- attempt count
- provider-owned remote ID

A synced export cannot regress to error.

Repeated synced acknowledgement is idempotent.

## Export sink boundary

CP-32 defines:

`ArchiveExportSink`

with:

```text
deliver(envelope)
→ created(remoteId)
→ existing(remoteId)
→ error(retryable, code)
```

The `existing` success disposition is important for retry-after-response-loss:

- first provider write may succeed
- response may be lost
- retry may discover the logical record already exists
- the retry must still converge to a successful synced state

CP-33's Google Drive adapter implements this interface.

## Relationship to current D1 recent_archive

The current D1 claim path already writes each accepted claim into `recent_archive` with:

- sync_status = pending
- synced_at = null

CP-32 deliberately does not change the D1 table schema.

The new `ArchiveExportLifecycle` is the provider-independent delivery contract.

CP-33 will decide the minimal persistence changes needed for retry/error bookkeeping while preserving the existing short D1 recent-archive buffer.

## Added code

- `packages/game-core/src/domain/archive-export.ts`
- public export from `packages/game-core/src/index.ts`

## Added tests

`packages/game-core/src/archive-export.test.ts`

Coverage:

1. immutable v1 envelope generation
2. mutable sync metadata excluded
3. stable provider-independent archive identity
4. stable idempotency key across D1 sync-state changes
5. pure JSON serialize/parse round trip
6. supported v1 compatibility recognition
7. unknown future version rejection
8. malformed envelope rejection
9. mismatched immutable identity rejection
10. pending → error → synced lifecycle
11. synced state cannot regress to error / repeated sync is idempotent

## Explicit non-goals

CP-32 does not include:

- Google Drive API calls
- OAuth Drive scope
- appDataFolder file creation/search
- remote retry scheduler
- D1 error-attempt columns
- archive compaction
- restore-from-archive gameplay authority
- production D1 retention tuning

Those belong to CP-33 or later W3 work.

## Validation required

Run:

- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`
- `git diff --check`
- `git status --short`

CP-31 accepted baseline:

- Web: 15 tests
- game-core: 56 tests
- Worker: 40 tests
- total: 111 tests

CP-32 adds 9 game-core test cases in one new test file.

Expected totals:

- Web: 15
- game-core: 65
- Worker: 40
- total: **120 tests**

## Exit criteria

CP-32 closes when:

- export envelope/version contract typechecks
- immutable archive identity is deterministic
- idempotency key is deterministic across retries
- mutable sync metadata is excluded from historical payload
- v1 fixture round-trip passes
- unsupported future versions are rejected
- malformed/mismatched envelopes are rejected
- pending/error/synced lifecycle is tested
- provider-independent sink contract is published
- all CP-31/M2 regressions remain green
- workspace typecheck/test/build/diff-check pass

Next CP: **CP-33 appDataFolder Sync + Retry**.


## Final validation — 2026-09-25

User-reported local validation:

- workspace typecheck: PASS
- Web: 4 files / 15 tests PASS
- game-core: 19 files / 65 tests PASS
- Worker: 14 files / 40 tests PASS
- total: **120 tests PASS**
- Web production build: PASS
- game-core build: PASS
- Worker Wrangler dry-run: PASS
- `git diff --check`: no errors reported
- only expected untracked local runtime path: `workers/api/.wrangler/`

Observed Web build:

- CSS: 4.45 kB raw / 1.60 kB gzip
- JS: 20.75 kB raw / 5.89 kB gzip

Observed Worker dry-run upload:

- 58.25 KiB raw / 11.53 KiB gzip

No blocking defects remain.

CP-32 exit criteria are satisfied.
