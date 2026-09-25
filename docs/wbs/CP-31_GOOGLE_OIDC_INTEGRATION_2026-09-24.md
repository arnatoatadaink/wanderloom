# CP-31 Google OIDC Integration — 2026-09-24

## Status

**Accepted / Complete — 2026-09-25**

## Objective

Connect the CP-30 provider-independent account-linking domain to Google identity in the Worker layer while preserving the existing guest player and enabling linked-account restore.

## Implemented

### D1 identity-link persistence

Migration:

- `workers/api/migrations/0002_external_identity_links.sql`

Adds:

- provider
- subject
- player_id
- linked_at

Constraints:

- unique provider+subject ownership
- one subject per provider per player
- foreign key to `players`

### D1 repository

Added:

- `D1ExternalIdentityLinkRepository`

Implements the CP-30 provider-independent repository boundary.

### Google ID-token verifier

Added:

- `GoogleJwksIdTokenVerifier`

Production verification uses Google OpenID discovery + JWKS and verifies:

- JWT shape
- RS256
- key id
- signature
- issuer
- audience
- expiration
- optional not-before
- non-empty stable `sub`

Only `sub` leaves the Google-specific verifier as the external identity subject.

Email is not used as the identity key.

The implementation intentionally does not use Google's `tokeninfo` endpoint in production.

### Link endpoint

`POST /api/auth/google/link`

Requires:

- existing Wanderloom player identity
- JSON body containing Google `credential`
- `GOOGLE_CLIENT_ID` Worker binding

Behavior:

- validates Google credential
- links `google + sub` to the existing PlayerId
- preserves guest progression/inventory
- returns idempotent `already_linked` on retry
- maps ownership conflicts to the CP-29 stable API error contract

### Restore endpoint

`POST /api/auth/google/restore`

Does not require the guest player header.

Behavior:

- validates Google credential
- resolves `google + sub`
- loads the linked existing player
- returns playerId + core + inventory

This provides the CP-31 linked-account restore boundary for a new browser/session.

### Web API client

Added:

- `linkGoogleAccount(credential)`
- `restoreGoogleAccount(credential)`

Successful restore replaces the Web client's current playerId with the restored linked player.

## Google configuration

Production/local interactive Google login requires:

`GOOGLE_CLIENT_ID`

to be configured in the Worker environment.

No real Google client ID or secret is committed to the repository.

## Browser UI integration

Google Identity Services browser wiring is now implemented behind an opt-in client ID configuration.

When `VITE_GOOGLE_CLIENT_ID` is absent or blank:

- the Google script is not loaded
- no Google account UI is rendered
- the existing guest-only flow remains unchanged

When configured:

- a new browser with no stored Wanderloom player is offered **Google restore** or **Continue as guest**
- an existing guest player sees a **Google link** control
- the Google Identity Services script is loaded only when needed
- the returned Google `credential` is sent to the Worker API
- successful restore replaces the Web client's active player ID and persists it to localStorage

The frontend client ID is public configuration, not a secret.

A real Google OAuth Web client ID was configured locally for manual browser acceptance.

## Earlier local acceptance checkpoint — 2026-09-25

The following checkpoint records the state before local setup was completed.
The final acceptance evidence appears below it.

Codex synchronized `feat/cp-31-google-oidc-integration` with `origin` through
commit `8aa8c47c93dae55e7e05fab0dcfd672ccf5a527a` and prepared local
configuration safeguards in commit `23f5ac9`.

Manual acceptance is **pending**. No real Google Client ID was available in the
local environment, so the Web and Worker Google configuration files were not
created and no browser identity flow was exercised.

Pending user-side work:

- provide or create a Google OAuth 2.0 Web application Client ID
- authorize the exact Vite Web origin used for local acceptance
- use that Client ID in the ignored `apps/web/.env.local` and
  `workers/api/.dev.vars` files
- complete the Google sign-in/link/restore browser steps in the acceptance
  runbook

The current Codex WSL session also does not expose a runnable Linux Node/pnpm
binary; the available Windows Node binary cannot be launched from this
session. Therefore the local Wrangler migration and dev-server commands remain
to be run from a working project Node/pnpm environment.

Evidence at this checkpoint:

- branch: `feat/cp-31-google-oidc-integration`
- synced source commit: `8aa8c47c93dae55e7e05fab0dcfd672ccf5a527a`
- Web origin: not started
- Worker origin: not started
- real Google Client ID configured: no
- migration `0002_external_identity_links.sql`: pending
- A guest creation/link: pending
- B fresh-state restore: pending
- C progression/inventory preservation: pending
- D idempotent relink: pending
- E unlinked-account restore: not exercised
- post-restore M2 regression: pending
- blocking issue: `Real Google Client ID / authorized origin configuration pending`
- repository `git diff --check`: PASS

## Final local acceptance — 2026-09-25 12:26 JST

- Branch tested: `feat/cp-31-google-oidc-integration`, source commit `3e28057`
  followed by the evidence commit `84331fd`.
- Web origin: `http://localhost:5173`.
- Worker origin: `http://localhost:8787`.
- Real Google OAuth Web Client ID: configured in ignored local Web and Worker
  files; Wrangler confirmed the `GOOGLE_CLIENT_ID` binding.
- Migration `0002_external_identity_links.sql`: PASS in local D1.
- A, guest creation and Google link: PASS; Worker logged guest bootstrap 201
  and Google link 200.
- B, fresh browser state restore: PASS; user reported `Google account restored.`
  and Worker logged restore 200 followed by successful state and inventory reads.
- C, player and rewards preserved: PASS. One Google identity link points to
  player `b752dcfb-49ae-4f5b-8570-d989a8b58ed2`. After a post-restore
  exploration, claim, and another Google restore, D1 retained level 1,
  EXP 15, Gold 7, one inventory item, and one equipped slot. The user also
  confirmed the received rewards remained visible after signing in again.
- D, idempotent relink: PASS; the user saw `Google account already linked.`,
  the repeated link returned HTTP 200, and D1 retained exactly one Google
  identity link row.
- E, unlinked account restore: HTTP 404 `linked_account_not_found` observed
  before the first link; cross-player conflicts remain covered by automated
  real-D1 tests.
- Post-restore M2 regression: PASS; Worker logged exploration creation 201,
  claim 200, equipment change 200, then restore 200 with zones, core,
  inventory, and current exploration reads all 200.
- Blocking defects: none. The Worker `fetch` receiver bug that initially
  produced an HTML 500 was fixed and covered by a regression test.
- Non-blocking observation: a `127.0.0.x` browser origin caused Google's
  `origin_mismatch`; the registered `localhost` origin succeeded.
- Final validation: workspace typecheck PASS; Web 15 tests, game-core 56,
  Worker 40 (111 total) PASS; Web/game-core/Worker dry-run builds PASS;
  `git diff --check` PASS.

No OAuth secret, raw ID token, Google subject, or personal email is recorded.

## Tests added

### Worker verifier

3 tests:

- valid signed Google-style RS256 token
- wrong audience rejected
- expired token rejected

Tests generate an ephemeral RSA key pair and use fake discovery/JWKS responses.

### Real-D1 account linking

6 tests:

- initial link persists
- idempotent retry
- cross-player identity conflict
- same-provider/different-subject conflict
- restore linked player without guest header
- invalid credential rejected

### Web client

4 tests total added in CP-31:

- link + restore methods
- restored playerId becomes the active client identity
- Google bridge remains disabled without a client ID
- blank client IDs are disabled
- configured client ID enables browser wiring

## API error additions

- `invalid_google_credential` → 401
- `linked_account_not_found` → 404

Existing CP-30 conflict codes remain 409.

## Validation required

Run:

- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`
- `git diff --check`
- `git status --short`

Expected increase from CP-30:

- Worker: +9 tests
- Web: +4 tests
- game-core: unchanged

The original baseline was **110 tests**. The Worker fetch regression test
raises the final total to **111 tests**.

## Exit criteria

Automated implementation acceptance requires:

- Google JWKS verifier typechecks and tests pass
- migration applies with existing migrations
- real-D1 link/retry/conflict/restore tests pass
- Web API client link/restore tests pass
- Google browser bridge configuration tests pass
- all pre-existing M2/M3 regressions stay green
- workspace typecheck/build/diff-check pass

Final CP-31 closure additionally requires manual browser acceptance with an actual configured Google Client ID:

1. new browser/profile can restore an already linked Wanderloom player
2. existing guest can link to Google
3. refresh and fresh-browser restore preserve the expected player identity
4. no guest progress is overwritten during link
5. invalid/foreign identity conflicts surface as stable API errors

## Next after CP-31

CP-32 Archive Export Contract.
