# CP-31 Google OIDC Integration — 2026-09-24

## Status

**In progress**

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

A real Google OAuth Web client ID must still be configured for manual browser acceptance.

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

Expected total if all tests are discovered: **110 tests**.

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
3. refresh preserves/restores the expected player identity
4. no guest progress is overwritten during link
5. invalid/foreign identity conflicts surface as stable API errors

## Next after CP-31

CP-32 Archive Export Contract.
