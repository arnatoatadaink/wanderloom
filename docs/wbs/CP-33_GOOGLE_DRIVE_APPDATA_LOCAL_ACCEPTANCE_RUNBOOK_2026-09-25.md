# CP-33 Google Drive appDataFolder Local Acceptance Runbook — 2026-09-25

## Status

**Ready for local validation after automated checks**

## Objective

Complete CP-33 manual validation for asynchronous archive export to Google Drive `appDataFolder`.

This runbook validates:

- Google Drive OAuth authorization-code flow
- linked Google identity continuity
- encrypted refresh-token persistence
- pending archive export
- retry-safe idempotent Drive write
- D1 `pending -> synced` transition only after confirmed remote write
- post-sync gameplay continuity

## Preconditions

Branch:

`feat/cp-33-appdatafolder-sync-retry`

Expected baseline before real-Google acceptance:

- Web tests: 16
- game-core tests: 65
- Worker tests: expected 52 after current CP-33 unit/integration additions
- workspace typecheck/build: PASS

## Google Cloud prerequisite

Reuse the same Google OAuth 2.0 Web application created for CP-31.

The current CP-33 code uses the Google Identity Services authorization-code popup model.

Required scope:

`https://www.googleapis.com/auth/drive.appdata`

The Web origin remains the exact registered JavaScript origin, typically:

`http://localhost:5173`

The client secret is now required by the Worker for the authorization-code exchange.

Do not expose the client secret to Web code.

## Local Web configuration

Existing:

`apps/web/.env.local`

```text
VITE_GOOGLE_CLIENT_ID=<REAL_GOOGLE_WEB_CLIENT_ID>
```

## Local Worker configuration

Update:

`workers/api/.dev.vars`

Required:

```text
GOOGLE_CLIENT_ID=<SAME_REAL_GOOGLE_WEB_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<REAL_GOOGLE_WEB_CLIENT_SECRET>
ARCHIVE_TOKEN_ENCRYPTION_KEY=<BASE64_32_BYTE_KEY>
```

Generate a local 32-byte encryption key without committing it:

```bash
openssl rand -base64 32
```

Use the single generated Base64 line as:

`ARCHIVE_TOKEN_ENCRYPTION_KEY`

Do not commit:

- client secret
- encryption key
- refresh token
- access token
- OAuth JSON credential file

## Apply migrations

CP-33 adds:

- `0003_archive_export_state.sql`
- `0004_google_drive_authorizations.sql`

Run:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 migrations apply wanderloom-local --local
```

Verify:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('archive_export_state','google_drive_authorizations') ORDER BY name;"
```

Expected:

- `archive_export_state`
- `google_drive_authorizations`

## Start local services

Worker:

```bash
pnpm --filter @wanderloom/api dev
```

Web:

```bash
pnpm --filter @wanderloom/web exec vite --host 0.0.0.0
```

Use:

`http://localhost:5173`

Do not switch to `127.0.0.x` unless that exact origin is also registered.

## Acceptance A — prepare linked player and pending archive

Use the same Google-linked Wanderloom player from CP-31, or link a guest first.

Create and claim one exploration.

Verify D1 has at least one pending archive:

```sql
SELECT player_id, exploration_id, sync_status, synced_at
FROM recent_archive
ORDER BY claimed_at DESC;
```

Expected new row:

- `sync_status = pending`
- `synced_at = NULL`

## Acceptance B — authorize Drive archive

On the ready screen after a successful Google link/restore:

1. click **Enable Drive archive**
2. Google popup requests application-data-folder access
3. choose the same Google account already linked to Wanderloom
4. approve the requested permission

Expected:

- authorization code reaches `POST /api/archive/google/authorize`
- HTTP 200
- Worker validates returned Google ID token
- returned `sub` matches the player's existing Google link
- refresh token is encrypted before D1 persistence
- Web immediately invokes `POST /api/archive/sync`

If a different Google account is selected, expected:

- `google_drive_identity_conflict`
- HTTP 409

## Acceptance C — encrypted authorization evidence

Do not print/decrypt the real refresh token in documentation.

Check only metadata:

```sql
SELECT
  player_id,
  length(refresh_token_ciphertext) AS ciphertext_length,
  length(refresh_token_iv) AS iv_length,
  granted_scope,
  authorized_at,
  updated_at
FROM google_drive_authorizations;
```

Expected:

- ciphertext length > 0
- IV length > 0
- granted scope contains `drive.appdata`
- no plaintext token field exists

## Acceptance D — archive sync

After authorization, expected Web status:

```text
Archive sync complete: N synced, 0 failed.
```

Check D1:

```sql
SELECT
  player_id,
  exploration_id,
  sync_status,
  synced_at
FROM recent_archive
ORDER BY claimed_at DESC;
```

For a successfully exported row:

- `sync_status = synced`
- `synced_at IS NOT NULL`

Check export state:

```sql
SELECT
  player_id,
  exploration_id,
  attempt_count,
  last_error_code,
  last_error_retryable,
  remote_id,
  synced_at
FROM archive_export_state;
```

Expected success:

- `attempt_count >= 1`
- `remote_id IS NOT NULL`
- `synced_at IS NOT NULL`
- latest error fields NULL

## Acceptance E — appDataFolder remote evidence

The appDataFolder is hidden from normal Google Drive UI.

Evidence should therefore come from the application/Drive API behavior rather than expecting a normal visible My Drive file.

The exported file metadata uses:

- parent: `appDataFolder`
- MIME type: `application/json`
- app property: `wanderloomArchiveKey`
- app property: `wanderloomArchiveVersion`

Do not change the appDataFolder file manually during acceptance.

## Acceptance F — retry/idempotency

Automated tests cover retry-after-provider-failure and existing-file convergence.

For manual acceptance, trigger `/api/archive/sync` again after the row is synced.

Expected:

- no duplicate logical archive is created
- no rewards are changed
- D1 remains synced
- gameplay core/inventory remain unchanged

If testing response-loss manually is impractical, automated CP-33 real-D1 + Drive sink tests are sufficient for that exact race.

## Acceptance G — gameplay continuity

After archive sync:

1. load zones
2. start another exploration
3. claim normally
4. verify Gold/EXP/inventory behave as before
5. confirm new archive begins as pending

Archive sync must never be required for a gameplay claim to succeed.

## Security acceptance

Confirm:

- `GOOGLE_CLIENT_SECRET` exists only in Worker local secret configuration
- `ARCHIVE_TOKEN_ENCRYPTION_KEY` exists only in Worker local secret configuration
- refresh tokens are encrypted at rest in D1
- access tokens are not persisted
- Drive authorization must belong to the same Google `sub` already linked to the Wanderloom player
- frontend receives no client secret or refresh token

## Required evidence

Record in CP-33 completion document:

- tested branch/commit
- Web origin
- Worker origin
- migrations 0003/0004 PASS
- Google Drive authorization PASS/FAIL
- linked-sub identity match PASS/FAIL
- encrypted refresh token persistence PASS/FAIL
- pending archive before sync PASS/FAIL
- appDataFolder export PASS/FAIL
- D1 synced transition PASS/FAIL
- repeat sync/idempotency PASS/FAIL
- post-sync gameplay regression PASS/FAIL
- blocking defects
- non-blocking observations

Do not record secrets, tokens, personal email, or Google subject.

## CP-33 completion boundary

CP-33 may be marked Accepted / Complete only after:

- automated typecheck/test/build green
- migrations 0003/0004 apply locally
- real Google Drive authorization succeeds
- at least one real pending archive is written to appDataFolder
- D1 marks it synced only after successful remote confirmation
- repeat sync produces no duplicate logical archive
- gameplay remains functional independently of archive sync

Next CP after acceptance:

**CP-34 Persistence / Identity Concurrency**
