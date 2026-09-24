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

## Current UI boundary

CP-31 currently implements the secure Worker/API and Web-client integration boundary.

It does **not yet render/load the Google Identity Services button/script in the Wanderloom UI**.

That interactive browser wiring should be added only after the API/security path passes local validation, then covered by CP-31 browser acceptance before closure.

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

1 test:

- link + restore methods
- restored playerId becomes the active client identity

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
- Web: +1 test
- game-core: unchanged

Expected total if all tests are discovered: **107 tests**.

## Exit criteria for implementation phase

Before interactive Google UI wiring:

- Google JWKS verifier typechecks and tests pass
- migration applies with existing migrations
- real-D1 link/retry/conflict/restore tests pass
- Web API client link/restore tests pass
- all pre-existing M2/M3 regressions stay green
- workspace typecheck/build/diff-check pass

After that, the remaining CP-31 work is interactive Google Identity Services browser wiring and manual acceptance with an actual configured Google Client ID.

## Next after CP-31

CP-32 Archive Export Contract.
