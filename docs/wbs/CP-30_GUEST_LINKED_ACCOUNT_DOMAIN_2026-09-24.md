# CP-30 Guest → Linked Account Domain — 2026-09-24

## Status

**In progress**

## Objective

Define a provider-independent domain contract for linking an existing guest player to an external identity without replacing or resetting the player's existing game state.

CP-30 does not implement Google OAuth/OIDC transport. That begins in CP-31.

## Domain decisions

### Stable external identity

An external identity is represented by:

- provider namespace
- stable provider subject identifier

Email address is explicitly not the primary identity key.

### Guest progress preservation

A successful first link keeps the existing `PlayerId`.

No new player is created by the pure domain decision.

### Idempotency

If the same provider+subject is already linked to the same player, the operation returns:

- `ok: true`
- `status: "already_linked"`

and reuses the existing link.

### Conflict: identity owned by another player

If the exact provider+subject is already linked to another player:

- result is a typed `external_identity_conflict`
- no ownership transfer occurs

### Conflict: same provider, different subject

The current CP-30 policy allows at most one subject per provider for one player.

Attempting to link another subject from the same provider returns:

- `provider_link_conflict`

This policy can be revisited later, but it is explicit and testable for the first Google integration.

## Repository boundary

The provider-independent domain defines an `ExternalIdentityLinkRepository` contract with:

- find by external identity
- list links by player
- insert link

No D1 implementation or migration is added in CP-30.

Those persistence details belong to CP-31/34.

## API contract preparation

CP-29's public error-code registry now reserves:

- `external_identity_conflict` → HTTP 409
- `provider_link_conflict` → HTTP 409

Both are non-retryable by default because repeating the same input cannot resolve the ownership conflict.

## Added tests

The game-core CP-30 suite covers:

1. first successful link
2. same-player idempotent retry
3. exact identity already owned by another player
4. same provider linked to a different subject
5. provider+subject equality semantics
6. blank provider/subject rejection

## Explicit non-goals

CP-30 does not include:

- Google authorization redirect
- callback handling
- token exchange
- ID-token verification
- D1 identity-link table
- session restore from Google identity
- archive integration
- UI login flow

## Validation required

Run:

- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`
- `git diff --check`
- `git status --short`

Expected increase from CP-29:

- game-core: +6 tests
- Web: unchanged
- Worker: existing API-contract test count unchanged

If all tests are discovered, expected total is **97 tests**.

## Exit criteria

CP-30 closes when:

- first-link behavior preserves the existing player ID
- retry is idempotent
- cross-player identity conflict is typed
- same-provider/different-subject conflict is typed
- provider-specific data does not enter game-core
- API conflict codes are reserved
- full workspace validation passes

Next CP: **CP-31 OIDC Integration**.
