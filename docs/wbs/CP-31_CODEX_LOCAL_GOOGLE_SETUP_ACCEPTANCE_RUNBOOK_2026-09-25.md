# CP-31 Google OIDC Local Setup & Manual Acceptance Runbook — 2026-09-25

## Status

**Completed / Historical acceptance runbook**

CP-31 automated implementation validation is green.

User-reported local WSL validation:

- workspace typecheck: PASS
- Web: 4 files / 15 tests PASS
- game-core: 18 files / 56 tests PASS
- Worker: 14 files / 39 tests PASS
- total: **110 tests PASS**
- Web production build: PASS
- game-core build: PASS
- Worker Wrangler dry-run: PASS
- `git diff --check`: clean
- only expected untracked local runtime path: `workers/api/.wrangler/`

The remaining CP-31 work is **local Google configuration + browser manual acceptance**.

---

## 1. Scope of this runbook

Codex should perform only the following:

1. prepare local Google OAuth/OIDC configuration
2. start Worker and Web locally
3. verify the Google Identity Services UI appears when configured
4. perform link and restore flows
5. verify player continuity
6. verify conflict/error behavior where practical
7. record evidence
8. update the CP-31 acceptance document if all required checks pass

Do **not** modify game balance, archive logic, Party/Caravan, monetization, or AI scope during this task.

---

## 2. Preconditions

Repository:

`arnatoatadaink/wanderloom`

Branch:

`feat/cp-31-google-oidc-integration`

Expected local source path:

`/mnt/c/Users/Y/Projects/codex_work/wanderloom`

Execution environment:

- WSL
- Node/pnpm from project `.nvmrc`
- Wrangler local D1
- browser on Windows host is acceptable

Before any setup:

```bash
git fetch origin
git checkout feat/cp-31-google-oidc-integration
git pull --ff-only
git status --short
```

Expected repository-local untracked path may be:

`workers/api/.wrangler/`

Do not add that directory to Git.

---

## 3. Google Cloud prerequisite

A Google OAuth 2.0 **Web application** client ID is required.

Codex should not invent or commit credentials.

The user must provide or create a Google OAuth Web Client ID if one does not already exist.

Required identity key semantics:

- provider = `google`
- stable subject = Google ID token `sub`
- email is not used as the Wanderloom identity key

No client secret is required by the current browser credential flow.

---

## 4. Authorized local origins

The exact Web origin must be registered in the Google OAuth client configuration.

For a standard Vite local run, use the actual local URL printed by Vite.

Typical example:

`http://localhost:5173`

If the browser uses a different hostname/port, register that exact origin too.

Do not assume the origin; use the URL actually opened in the browser.

The Worker API may be served separately by Wrangler. The browser Google Identity Services interaction is tied to the Web origin, not the Worker port.

---

## 5. Web environment setup

Create the local Web env file from the tracked example:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit:

`apps/web/.env.local`

Set:

```text
VITE_GOOGLE_CLIENT_ID=<REAL_GOOGLE_OAUTH_WEB_CLIENT_ID>
```

Important:

- `.env.local` must remain untracked
- do not commit the real client ID through an accidental env-file add
- the client ID itself is public configuration, but this project intentionally keeps environment-specific values out of the repository

Check:

```bash
git status --short
```

If `.env.local` appears as untracked, verify whether it is ignored before continuing.

If it is not ignored, add an ignore rule for `apps/web/.env.local` before manual testing and commit only the ignore rule, never the actual env file.

---

## 6. Worker environment setup

The Worker requires the same Google client ID through:

`env.GOOGLE_CLIENT_ID`

For local Wrangler execution, use a local-only environment mechanism supported by the current Wrangler setup.

Preferred local file:

`workers/api/.dev.vars`

Contents:

```text
GOOGLE_CLIENT_ID=<REAL_GOOGLE_OAUTH_WEB_CLIENT_ID>
```

Do not commit `.dev.vars`.

Before continuing, confirm:

```bash
git status --short
```

Only expected ignored/local runtime files should remain.

If `.dev.vars` is not ignored, add it to `.gitignore` and commit only the ignore rule.

---

## 7. Apply local D1 migrations

CP-31 adds:

`workers/api/migrations/0002_external_identity_links.sql`

Apply migrations to the local Wrangler D1 database before browser acceptance.

Use the repository's current Wrangler/D1 workflow. From the repo root, a typical command is:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 migrations apply wanderloom-local --local
```

If Wrangler resolves the configured database by binding rather than name in the current version, use the equivalent command shown by Wrangler help/config.

Success criteria:

- migration 0001 remains applied
- migration 0002 applies successfully
- no destructive reset of existing local data unless intentionally starting a fresh acceptance database

Optional verification:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 execute wanderloom-local --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='external_identity_links';"
```

Expected table:

`external_identity_links`

---

## 8. Start local Worker

Open terminal A:

```bash
cd /mnt/c/Users/Y/Projects/codex_work/wanderloom
pnpm --filter @wanderloom/api dev
```

Record the local Worker URL printed by Wrangler.

Typical example:

`http://localhost:8787`

Do not assume this value if Wrangler prints another port.

---

## 9. Start local Web

Open terminal B:

```bash
cd /mnt/c/Users/Y/Projects/codex_work/wanderloom
pnpm --filter @wanderloom/web exec vite --host 0.0.0.0
```

Record the URL printed by Vite.

Open that URL in the browser.

If the current Web dev setup requires an API proxy and the existing repository already defines one, use the existing setup.

If requests target the wrong origin, do not redesign the API during this acceptance task; first inspect the existing Vite/Worker local routing assumptions and use the project's established local-start method.

---

## 10. Acceptance sequence A — new guest + Google link

Use a browser profile with no existing Wanderloom localStorage, or clear only the relevant Wanderloom keys:

- `wanderloom.playerId`
- `wanderloom.training.completed`

Do not clear unrelated browser data.

### A1. Initial account entry

With Google client ID configured, expected behavior before guest bootstrap:

- Google restore control is visible
- `Continue as guest` is visible

### A2. Continue as guest

Choose:

`Continue as guest`

Expected:

- a new guest PlayerId is created
- normal Wanderloom state loads
- the existing M2 exploration UI remains usable

Record the PlayerId from localStorage or API state.

Call this:

`PLAYER_A`

### A3. Link the guest to Google

On the ready screen, use the Google link control.

Choose the intended Google account.

Expected:

- link request succeeds
- UI reports `Google account linked.` or equivalent
- current Wanderloom PlayerId remains `PLAYER_A`
- core/inventory/progression are unchanged by the link itself

### A4. D1 evidence

Verify:

```sql
SELECT provider, subject, player_id, linked_at
FROM external_identity_links;
```

Expected:

- provider = `google`
- player_id = `PLAYER_A`
- subject is non-empty
- subject is not an email address used as primary key

Do not record the real Google subject in public documentation if unnecessary. Redact it in evidence if needed.

---

## 11. Acceptance sequence B — restore from a fresh browser state

Use a separate browser profile/incognito context, or remove only the Wanderloom localStorage keys.

Important: keep the same local D1 database.

Reload/open Wanderloom.

Expected:

- Google restore control appears
- no new guest is automatically created before the user chooses a path

Choose the same Google account used in sequence A.

Expected:

- restore succeeds
- returned PlayerId is exactly `PLAYER_A`
- core progression matches the previously linked player
- inventory matches the previously linked player
- localStorage is updated with `PLAYER_A`
- subsequent state/inventory requests use `PLAYER_A`

This is the most important CP-31 browser acceptance condition.

---

## 12. Acceptance sequence C — progress preservation

Before linking or after linking, create a visible state change if convenient:

- gain Gold/EXP through an expedition, or
- equip a known item

Then perform restore in a fresh browser state.

Expected:

- restored account contains the same progression
- restored inventory/equipment matches
- no new empty guest state replaces the linked player

If producing a full expedition would slow the acceptance unnecessarily, existing persisted non-zero state is sufficient.

---

## 13. Acceptance sequence D — idempotent relink

With `PLAYER_A` active, invoke Google link again using the same Google identity.

Expected API semantics:

```text
status = already_linked
```

Expected:

- no duplicate row
- no PlayerId change
- no progression/inventory change
- HTTP request remains successful

Verify row count:

```sql
SELECT COUNT(*) AS count
FROM external_identity_links
WHERE player_id = '<PLAYER_A>'
  AND provider = 'google';
```

Expected:

`1`

---

## 14. Acceptance sequence E — invalid/unlinked restore

Where practical, verify at least one failure path.

### Unlinked Google identity

If a second Google identity is available and not linked to Wanderloom:

Expected:

- restore fails with:
  - code = `linked_account_not_found`
  - HTTP 404

### Invalid credential

Already covered by automated tests.

Manual reproduction is optional and should not require tampering with real credentials.

---

## 15. Cross-player conflict

This is already covered by the real-D1 automated test and does not require creating extra real Google accounts during manual acceptance.

Automated contract:

- same Google provider+subject cannot belong to two players
- conflict code = `external_identity_conflict`
- HTTP 409

Likewise:

- one player cannot link a different subject for the same provider
- conflict code = `provider_link_conflict`
- HTTP 409

Do not make extra accounts solely to reproduce these cases manually unless convenient.

---

## 16. Regression checks

After Google linking/restoration, verify the original v0.0.2/M2 loop is still usable:

1. zone list renders
2. duration can be selected
3. exploration can start
4. frozen effective stats still display where applicable
5. claim still works
6. inventory still renders
7. equip still works
8. refresh does not corrupt state

One successful post-restore exploration interaction is sufficient for browser regression evidence.

---

## 17. Low-bandwidth acceptance

Confirm both modes:

### Without Google client ID

Temporarily run Web without `VITE_GOOGLE_CLIENT_ID`.

Expected:

- Google Identity Services script is not requested
- no Google UI appears
- existing guest-only flow remains functional

### With Google client ID

Expected:

- Google script loads only for the configured Google-enabled UI
- no new heavy framework/assets were introduced by CP-31
- main Web build remains within the currently observed range

Latest automated build evidence before manual setup:

- CSS: ~4.45 kB raw / ~1.60 kB gzip
- JS: ~20.68 kB raw / ~5.83 kB gzip

Treat these as evidence, not hard production limits.

---

## 18. Required evidence to record

Codex should add a short acceptance section to:

`docs/wbs/CP-31_GOOGLE_OIDC_INTEGRATION_2026-09-24.md`

Record:

- date/time
- branch/commit tested
- Web origin
- Worker origin
- whether real Google Client ID was configured
- migration 0002 result
- A: guest creation/link result
- B: fresh-state restore result
- C: progression/inventory preservation result
- D: idempotent relink result
- E: optional unlinked-account restore result
- post-restore M2 regression result
- blocking defects
- non-blocking observations

Do not record:

- OAuth client secret
- raw ID token
- full Google subject unless necessary
- personal email address
- access/refresh tokens

---

## 19. Final CP-31 acceptance criteria

CP-31 may be marked **Accepted / Complete** only when all mandatory conditions are satisfied:

- automated typecheck PASS
- automated tests PASS
- automated build PASS
- migration 0002 works locally
- real Google link works
- same guest PlayerId is preserved after link
- fresh browser state restores the same linked PlayerId
- core/inventory survive restore
- idempotent relink does not duplicate identity rows
- original M2 gameplay loop still works after restore
- no blocking defect remains

The already completed automated baseline is:

```text
Web:       15 tests PASS
game-core: 56 tests PASS
Worker:    39 tests PASS
Total:     110 tests PASS
typecheck: PASS
build:     PASS
diff:      clean
```

---

## 20. If Google configuration cannot be completed

If no usable Google OAuth Web Client ID is available:

- do not mark CP-31 complete
- leave status as `In progress / automated implementation accepted`
- record the blocker as:
  - `Real Google Client ID / authorized origin configuration pending`
- do not weaken the manual acceptance requirement

The next implementation CP (CP-32) should not be treated as formally started until CP-31 is accepted, unless the user explicitly authorizes parallel work.

---

## 21. Completion action

If all manual checks pass:

1. update CP-31 document to `Accepted / Complete`
2. include the manual evidence summary
3. run:
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`
   - `git diff --check`
4. commit the acceptance documentation
5. push the branch
6. report the final branch HEAD and validation totals

Do **not** merge to `m3` from Codex unless specifically instructed; ChatGPT-side integration will handle the CP merge after review.
