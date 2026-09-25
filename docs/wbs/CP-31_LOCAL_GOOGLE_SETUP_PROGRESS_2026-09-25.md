# CP-31 Local Google Setup Progress & Next Actions — 2026-09-25

## Status

**Local setup in progress**

### Codex recheck — 2026-09-25

The earlier conclusion that Node/pnpm could not run in WSL was incorrect.
Node `v22.20.0` is installed under `/home/y/.nvm/versions/node/v22.20.0/bin`
and pnpm `10.17.1` under `/home/y/.local/share/pnpm`; neither was on the
default PATH for the Codex shell.

The local setup has now been restarted and verified:

- `apps/web/.env.local` and `workers/api/.dev.vars` exist, are Git-ignored,
  and contain matching non-empty Google Web Client IDs.
- Wrangler 4.132.0 reports `Using secrets defined in .dev.vars` and shows
  `env.GOOGLE_CLIENT_ID` as a hidden local binding.
- Worker: `http://localhost:8787` ready.
- Web: `http://localhost:5173` ready.
- `GET /api/health` through the Vite proxy: HTTP 200.
- `POST /api/auth/google/restore` with an empty JSON body through the Vite
  proxy: HTTP 400 `invalid_request`. This confirms the prior `not_ready`
  (HTTP 501) configuration failure is resolved; it does not prove real Google
  credential validation or account restore.
- Local D1 migrations `0001_initial.sql` and
  `0002_external_identity_links.sql` are recorded; `external_identity_links`
  exists. No Google identity link row existed at this checkpoint.
- Workspace typecheck: PASS.
- Tests: Web 15, game-core 56, Worker 39; total 110 PASS.
- Web, game-core, and Worker dry-run builds: PASS.
- `git diff --check`: PASS.

Real Google link, fresh-browser restore, player continuity, idempotent relink,
and post-restore M2 regression remain pending user browser interaction.
CP-31 remains **In progress**.

### Browser restore failure and fix — 2026-09-25

A real Google restore attempt reached the Worker, but the Worker returned an
HTML 500 response. The browser displayed `Unexpected token '<'` while trying
to parse that response as JSON. Wrangler logged `Illegal invocation` from
`GoogleJwksIdTokenVerifier.verify` at the Google discovery fetch call.

The verifier's default fetch is now a wrapper that calls `globalThis.fetch`,
preserving the Worker runtime's required receiver. A regression test covers
receiver-sensitive fetch behavior.

Post-fix verification:

- Typecheck: PASS.
- Tests: Web 15, game-core 56, Worker 40; total 111 PASS.
- Web, game-core, and Worker dry-run builds: PASS.
- Through the live Vite proxy, a deliberately invalid test ID token now
  returns JSON HTTP 401 `invalid_google_credential`, rather than HTML 500.

The user still needs to retry with a real Google account and confirm the
link/restore and player continuity acceptance steps.

### Google browser acceptance progress — 2026-09-25 12:13 JST

The user completed a guest flow and reported `Google account already linked.`
on the second link attempt. After clearing browser cookies, the same Google
account returned `Google account restored.`

Worker logs confirm guest bootstrap HTTP 201, Google link HTTP 200 twice, and
Google restore HTTP 200. The restored page then fetched zones, core,
inventory, and current exploration with HTTP 200. Local D1 contains exactly
one Google identity link, attached to player
`b752dcfb-49ae-4f5b-8570-d989a8b58ed2`; core and inventory rows exist for
that player. Its persisted core has Gold 2 and EXP 5 after an earlier
exploration claim, showing nonzero progress remained available after restore.
No Google subject, email, or token is recorded here.

Post-restore M2 exploration and claim remain pending user confirmation.

Automated CP-31 implementation validation is already green:

- workspace typecheck: PASS
- Web: 15 tests PASS
- game-core: 56 tests PASS
- Worker: 39 tests PASS
- total: 110 tests PASS
- Web/game-core/Worker build: PASS
- `git diff --check`: clean

Local D1 preparation is also complete:

- `0002_external_identity_links.sql`: applied successfully
- `external_identity_links` table: confirmed present

Google OAuth Web Client has been created by the user.

---

## Current manual acceptance state

The first browser attempt failed with:

`400 origin_mismatch`

The browser had been opened with a `127.0.0.x` origin while Google Cloud had been configured for `localhost`.

The user switched to the `localhost` origin and progressed past that error.

The next observed application error is:

```text
CONNECTION / STATE ERROR
Could not continue
not_ready (HTTP 501)
```

This strongly indicates that the browser-side Google Identity Services step progressed far enough to call the Wanderloom API, but the Worker-side Google OIDC configuration is not currently available to the running Worker process.

---

## Most likely cause

The current Worker code returns `not_ready("google_oidc")` when either of these is missing:

- `env.GOOGLE_CLIENT_ID`
- runtime Google ID token verifier

The default runtime already provides the verifier.

Therefore the first configuration check is:

`workers/api/.dev.vars`

Expected content:

```text
GOOGLE_CLIENT_ID=<REAL_GOOGLE_OAUTH_WEB_CLIENT_ID>
```

The value must match the Web-side value:

```text
apps/web/.env.local
VITE_GOOGLE_CLIENT_ID=<SAME_REAL_GOOGLE_OAUTH_WEB_CLIENT_ID>
```

Do not add the Google client secret.

Do not add the downloaded OAuth JSON credential file to the repository.

---

## Required local checks

From repository root:

```bash
cd /mnt/c/Users/Y/Projects/codex_work/wanderloom
```

Confirm the Worker env file exists:

```bash
ls -la workers/api/.dev.vars
```

Confirm the expected key exists without printing the actual Client ID:

```bash
grep -q '^GOOGLE_CLIENT_ID=' workers/api/.dev.vars && echo "GOOGLE_CLIENT_ID configured"
```

Expected:

```text
GOOGLE_CLIENT_ID configured
```

Also confirm the Web env key exists:

```bash
grep -q '^VITE_GOOGLE_CLIENT_ID=' apps/web/.env.local && echo "VITE_GOOGLE_CLIENT_ID configured"
```

Expected:

```text
VITE_GOOGLE_CLIENT_ID configured
```

---

## Restart requirement

Both Vite and Wrangler should be restarted after changing environment files.

### Worker

Stop the current Worker with Ctrl+C.

Restart from repository root:

```bash
pnpm --filter @wanderloom/api dev
```

Observe Wrangler startup output.

If Wrangler reports loading local environment variables, record that line in the acceptance evidence.

### Web

Stop the current Vite process with Ctrl+C.

Restart:

```bash
pnpm --filter @wanderloom/web exec vite --host 0.0.0.0
```

Use the Vite URL through the registered Google origin.

Preferred local browser origin:

```text
http://localhost:5173
```

Do not switch to the WSL/127.0.0.x/Network URL unless that exact origin has also been registered in Google Cloud.

---

## Google Cloud origin check

The active OAuth Web Client should include the exact browser origin under:

`Authorized JavaScript origins`

For the normal Vite development port:

```text
http://localhost:5173
```

Origin matching includes:

- scheme
- hostname
- port

Therefore these are different origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:5174`
- `https://localhost:5173`

The current Wanderloom popup/callback flow does not require an OAuth redirect URI.

---

## Retry sequence

After restarting both processes:

1. Open Wanderloom through the registered `localhost` origin.
2. Use the Google restore/link UI.
3. Complete Google account selection.
4. Observe the browser result.
5. Observe Worker request logs.

Expected successful restore/link behavior:

```text
Google popup
→ credential returned to browser callback
→ Wanderloom /api/auth/google/link or /restore
→ Worker validates Google ID token
→ Google subject resolved
→ D1 external_identity_links lookup/write
→ Wanderloom player returned
```

---

## If HTTP 501 remains

Do not modify OAuth settings again immediately.

The next diagnostic target is whether Wrangler is loading `.dev.vars` for the package process launched through:

```bash
pnpm --filter @wanderloom/api dev
```

Collect:

1. Worker startup log
2. exact Worker local URL
3. whether Wrangler reports loading `.dev.vars`
4. result of:
   ```bash
   grep -q '^GOOGLE_CLIENT_ID=' workers/api/.dev.vars && echo configured
   ```

Do not print the actual Client ID in logs shared publicly.

If necessary, inspect the package's working-directory behavior before changing code.

---

## If HTTP 401 invalid_google_credential appears instead

That is a different stage and means the Worker is receiving `GOOGLE_CLIENT_ID` but the ID token validation failed.

Check:

- Web and Worker Client IDs are identical
- Google Cloud OAuth client used by the browser is the same client
- token audience corresponds to that Client ID
- system clock is reasonable
- browser is using the registered origin

Do not replace the verifier with Google's `tokeninfo` endpoint for production.

---

## If restore returns 404 linked_account_not_found

That is expected for a Google identity that has never been linked to a Wanderloom player.

Correct acceptance order is:

1. continue as guest
2. link the current guest to Google
3. preserve the current PlayerId
4. open a fresh browser state
5. restore using the same Google account
6. verify the same PlayerId/core/inventory are returned

---

## Git safety

After local env configuration:

```bash
git status --short
```

Expected visible untracked runtime output may include:

```text
?? workers/api/.wrangler/
```

The following must not be committed:

- `apps/web/.env.local`
- `workers/api/.dev.vars`
- downloaded Google OAuth JSON
- OAuth client secret
- raw Google ID tokens

---

## Completion evidence requested from local/Codex work

When the local Google flow succeeds, record:

- tested branch + HEAD commit
- Web origin
- Worker origin
- migration 0002: PASS
- real Google link: PASS/FAIL
- same guest PlayerId preserved: PASS/FAIL
- fresh-browser restore: PASS/FAIL
- core/inventory preserved: PASS/FAIL
- idempotent relink: PASS/FAIL
- post-restore M2 gameplay regression: PASS/FAIL
- blockers / observations

Do not record personal email, raw token, OAuth secret, or full Google subject unless needed.

---

## CP-31 acceptance boundary

CP-31 must remain **In progress** until real Google browser link + restore are manually confirmed.

Once all manual conditions pass:

1. update `docs/wbs/CP-31_GOOGLE_OIDC_INTEGRATION_2026-09-24.md`
2. mark CP-31 `Accepted / Complete`
3. run full validation:
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`
   - `git diff --check`
4. commit/push the acceptance evidence
5. report the final branch HEAD
6. leave merging into `m3` for the ChatGPT-side review/integration step
