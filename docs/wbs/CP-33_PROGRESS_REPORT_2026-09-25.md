# CP-33 Google Drive appDataFolder Sync + Retry — Progress Report — 2026-09-25

## Status

**In progress — real Google Drive sync succeeded for two archives; final manual regression checks pending**

M3 critical path position:

```text
CP-31 Google OIDC Integration              ✅ Accepted / merged
CP-32 Archive Export Contract              ✅ Accepted / merged
CP-33 appDataFolder Sync + Retry            🚧 In progress
CP-34 Persistence / Identity Concurrency    ⏳ Next
CP-35 Full M3 Acceptance                    ⏳ Later
```

Branch:

`feat/cp-33-appdatafolder-sync-retry`

## Objective

Use Google Drive `appDataFolder` as the first long-term archive backend while preserving D1 as gameplay authority.

Required properties:

- archive sync must not block or roll back accepted gameplay claims
- pending archives must survive provider failure
- retries must converge on one logical remote archive record
- D1 marks an archive synced only after confirmed remote success
- duplicate remote delivery must be idempotent
- Google Drive authorization must belong to the same linked Google account as the Wanderloom player

## Completed implementation

### 1. D1 archive export retry state

Added migration:

`workers/api/migrations/0003_archive_export_state.sql`

Added:

`archive_export_state`

Tracks:

- player ID
- exploration ID
- attempt count
- last attempt time
- last error code
- retryable flag
- remote ID
- synced timestamp

This state is separated from the immutable archive export payload.

### 2. Google Drive authorization persistence

Added migration:

`workers/api/migrations/0004_google_drive_authorizations.sql`

Added:

`google_drive_authorizations`

Stores:

- encrypted refresh-token ciphertext
- AES-GCM IV
- granted scope
- authorization/update timestamps

The schema does not contain a plaintext refresh-token field.

### 3. Pending archive retention safety

The claim-path archive prune rule was changed so that unsynced records are not pruned.

Current rule:

```text
pending -> never prune
synced  -> eligible for recent-archive retention pruning
```

This prevents a provider outage from deleting the only unsynced historical record.

### 4. Provider-independent D1 export repository

Added:

`workers/api/src/persistence/d1-archive-export-repository.ts`

Responsibilities:

- list pending archive envelopes
- read export-attempt state
- record retryable/non-retryable failure
- record confirmed success
- update `recent_archive.sync_status` to `synced` only after success

### 5. Google Drive appDataFolder sink

Added:

`workers/api/src/google-drive-appdata-sink.ts`

Behavior:

1. query `spaces=appDataFolder`
2. search by stable `wanderloomArchiveKey` app property
3. if an existing logical record is found:
   - return `existing(remoteId)`
4. otherwise:
   - create JSON file with parent `appDataFolder`
   - store archive idempotency metadata in `appProperties`
5. classify transient HTTP failures as retryable

This supports retry-after-response-loss convergence.

### 6. Retry-safe sync service

Added:

`workers/api/src/services/sync-player-archive.ts`

Behavior:

```text
pending archive
  -> deliver to sink
      -> failure
          -> keep D1 archive pending
          -> persist attempt/error state
      -> created/existing success
          -> persist remote ID
          -> mark D1 archive synced
```

Non-retryable failures are retained rather than repeatedly retried automatically.

### 7. Real-D1 retry integration coverage

Added:

`workers/api/src/cp33-archive-sync.integration.test.ts`

Verified with real local D1 test environment:

- retryable provider failure leaves archive pending
- failure attempt state persists
- later retry succeeds
- an `existing` remote record is accepted as successful idempotent convergence
- archive transitions to synced only after confirmed delivery
- attempt count increments across retry

### 8. Google OAuth authorization-code flow

Added:

- `workers/api/src/google-oauth.ts`
- Web GIS code-client support
- `POST /api/archive/google/authorize`

Current flow:

```text
browser
  -> Google Identity Services initCodeClient()
  -> authorization code
  -> Worker code exchange
  -> access token + refresh token + ID token
  -> verify Google ID token
  -> compare Google sub with existing Wanderloom Google link
  -> encrypt refresh token
  -> persist encrypted authorization
```

Required scope:

`https://www.googleapis.com/auth/drive.appdata`

The Google account used for Drive authorization must match the Google identity already linked to the same Wanderloom player.

### 9. Refresh-token protection

Added:

`workers/api/src/secret-cipher.ts`

Uses AES-GCM with a local/server secret:

`ARCHIVE_TOKEN_ENCRYPTION_KEY`

Properties:

- refresh token encrypted before D1 persistence
- random IV for each encryption
- access token not persisted
- encryption key not stored in D1
- key expected only in Worker secret/environment configuration

### 10. Archive sync API

Added:

`POST /api/archive/sync`

Behavior:

1. load encrypted Google Drive authorization
2. decrypt stored refresh token
3. obtain a fresh Google access token
4. instantiate Google Drive appDataFolder sink
5. attempt pending archive delivery
6. return sync summary

Example response shape:

```text
attempted
synced
failed
skippedNonRetryable
```

### 11. Web support

Added API-client methods for:

- Google Drive authorization
- archive sync

Added Google Identity Services authorization-code support using:

- `openid`
- `drive.appdata`

Added UI action:

**Enable Drive archive**

The link/restore Google identity flow remains separate from Drive authorization.

## Automated validation

Latest validation after the 403 recovery change:

### Typecheck

- Web: PASS
- game-core: PASS
- Worker: PASS (rerun)

### Tests

```text
Web         16 PASS
game-core   65 PASS
Worker      54 PASS
----------------
Total      135 PASS
```

The Web and game-core counts above are from the earlier local run; the Worker
suite was rerun after the 403 recovery change. Both new cases passed: sanitized
Google 403 reason capture and retry after renewed authorization.

Worker suite includes:

- CP-33 real-D1 retry integration
- Google Drive appDataFolder sink tests
- Google OAuth code/refresh tests
- AES-GCM secret-cipher tests
- CP-31 Google OIDC regression
- CP-27 full M2 acceptance
- CP-26 M2 regression
- playable-loop integration
- claim/equipment concurrency regression

### Build

- Web Vite production build: PASS
- game-core TypeScript build: PASS
- Worker Wrangler dry-run: PASS (rerun after 403 recovery change)

Observed Worker dry-run:

```text
Total Upload: 81.02 KiB
gzip:        15.91 KiB
```

### Working tree

`git diff --check`: clean

Only expected local runtime path remains untracked:

`workers/api/.wrangler/`

## Local migration acceptance

Local D1 migration application completed successfully.

Applied:

```text
0003_archive_export_state.sql         ✅
0004_google_drive_authorizations.sql  ✅
```

Verified tables:

```text
archive_export_state
google_drive_authorizations
```

## Google authorization setup findings

### Initial Google test-user denial

Observed:

```text
403 access_denied
wanderloom has not completed the Google verification process
```

Interpretation:

The Google OAuth application was still in Testing mode and access was restricted to configured test users.

This is an OAuth consent/test-user configuration issue rather than a Wanderloom gameplay or D1 issue.

### Popup-closed observation

Observed:

```text
Google Drive authorization popup failed: popup_closed
```

This represented an authorization popup closing before an authorization code was returned.

It was not treated as a successful authorization.

### Subsequent Drive authorization

The flow later progressed far enough for the application UI to report:

```text
Google account already linked.
Enable Drive archive
Archive sync complete: 0 synced, 2 failed.
```

This demonstrates that:

- existing Google account linkage was recognized
- Drive authorization UI proceeded beyond the earlier test-user/popup blockers
- `/api/archive/sync` executed
- two pending archive records were discovered and attempted

At that point, it did **not** demonstrate successful appDataFolder persistence.

## 403 investigation and resolution

The initial real Google Drive sync reported:

```text
0 synced
2 failed
```

CP-33 remained **In progress** while this failure was investigated.

Local D1 inspection on 2026-09-25 found two failed attempts, both with
`last_error_code = drive_list_http_403` and `last_error_retryable = 0`.
Both rows have `remote_id = NULL` and `synced_at = NULL`. Their matching
`recent_archive` rows remain `pending` with `synced_at = NULL`.

The encrypted Google authorization has a nonempty ciphertext (160 characters),
a nonempty IV (16 characters), and a granted scope containing `drive.appdata`.
These facts establish that authorization was stored, but they do not establish
why Google rejected `files.list`. The previous response body was not retained.

The current sink now records a sanitized Google error `reason` suffix when one
is present, such as `drive_list_http_403_accessNotConfigured`. Successful Drive
reauthorization also makes existing unsynced 403 failures eligible for another
attempt. The archive remains pending until remote success is confirmed.

### Follow-up after renewed authorization

At 2026-09-25 07:57:40–41 UTC, both affected rows reached attempt count 2.
Their new `last_error_code` is `drive_list_http_403_accessNotConfigured`.
Both still have `remote_id = NULL` and `synced_at = NULL`; all nine local
archives remain `pending`. The Google response now points to the Drive API
being unavailable in the Google Cloud project used by the OAuth client.

The next action was enabling **Google Drive API** (`drive.googleapis.com`) in
that project's API Library and retrying **Enable Drive archive**.

### Follow-up after Google Drive API enablement

The Web reported `Archive sync complete: 2 synced, 0 failed`.
Local D1 inspection confirmed both previously failed rows now have distinct,
nonempty `remote_id` values, `synced_at` timestamps, attempt count 3, and
cleared error fields. Their `recent_archive` rows are `synced` with matching
timestamps. Seven other local archives remain `pending`.
Those seven belong to three other player IDs; the authorized player's two
archives are both synced. The two stored remote IDs are distinct.

This proves the real Drive delivery response and D1 transition for these two
records. A repeated sync and post-sync gameplay check are still needed for
the remaining manual acceptance criteria.

## Diagnostic queries used during investigation

### A. Inspect archive export failure state

Run:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "
SELECT
  player_id,
  exploration_id,
  attempt_count,
  last_attempt_at,
  last_error_code,
  last_error_retryable,
  remote_id,
  synced_at
FROM archive_export_state
ORDER BY last_attempt_at DESC;
"
```

Key fields:

- `last_error_code`
- `last_error_retryable`
- `remote_id`
- `synced_at`

Potential examples include:

```text
drive_list_http_401
drive_list_http_403
drive_create_http_403
drive_create_http_429
drive_create_http_5xx
drive_duplicate_archive_identity
```

Do not assume which code applies until D1 evidence is read.

### B. Confirm pending archive state

Run:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "
SELECT
  exploration_id,
  sync_status,
  synced_at,
  claimed_at
FROM recent_archive
ORDER BY claimed_at DESC;
"
```

Expected while sync is failing:

- affected rows remain `pending`
- `synced_at` remains NULL

This is a required CP-33 safety property.

### C. Confirm encrypted authorization metadata

Do not output token contents.

Run only metadata query:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "
SELECT
  player_id,
  length(refresh_token_ciphertext) AS ciphertext_length,
  length(refresh_token_iv) AS iv_length,
  granted_scope,
  authorized_at,
  updated_at
FROM google_drive_authorizations;
"
```

Verify:

- ciphertext length > 0
- IV length > 0
- granted scope contains `drive.appdata`

### D. Google Cloud checks if error is 403

If D1 reports a Drive 403, verify:

- Google Drive API is enabled for the OAuth project
- OAuth Data Access includes `drive.appdata`
- authorization was granted by a configured test user
- the selected account matches the linked Wanderloom Google account

The observed Google response reason was `accessNotConfigured`. After the
project's Drive API was enabled, the next sync succeeded for two archives.

## Local secret configuration

Required Worker-local values:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
ARCHIVE_TOKEN_ENCRYPTION_KEY
```

`ARCHIVE_TOKEN_ENCRYPTION_KEY` is Wanderloom-internal configuration.

It is:

- generated locally/server-side
- stored in Worker secret/environment configuration
- not configured in Google Cloud
- not committed to Git
- not exposed to browser code

The same applies to the Google client secret with respect to browser exposure.

## CP-33 acceptance checklist

Current state:

```text
Automated typecheck                         ✅
133 automated tests                         ✅
Web/game-core/Worker build                  ✅
0003 migration                              ✅
0004 migration                              ✅
retryable failure preserves pending         ✅ automated
retry success marks synced                  ✅ automated
existing-file convergence                   ✅ automated
unsynced archive prune protection           ✅
Google linked-account continuity            ✅
Google Drive authorization flow reached     ✅
encrypted refresh-token mechanism           ✅ automated
real appDataFolder write                    ✅ two confirmed Drive IDs
real D1 pending -> synced transition         ✅ two rows
403 reason from new Google response          ✅ accessNotConfigured; resolved
manual duplicate-safe repeat sync            ⏳ pending
post-real-sync gameplay regression            ⏳ pending
```

## Exit boundary

Do **not** mark CP-33 Accepted / Complete yet.

CP-33 closes only after:

1. provider failure reason is identified and resolved ✅
2. at least one real pending archive is successfully written to Google Drive `appDataFolder` ✅
3. D1 marks that archive synced only after remote confirmation ✅
4. repeated sync does not create a duplicate logical archive
5. core/inventory/reward state remains unchanged by archive retries
6. gameplay continues normally after successful sync

After CP-33 acceptance, proceed to:

**CP-34 Persistence / Identity Concurrency**
