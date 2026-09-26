# M4 Definition — Seamless Persistence UX — 2026-09-26

## Status

**Planning baseline / proposed next milestone**

## Release baseline

M4 starts from the `v0.0.3` / main M3 baseline.

M3 is closed and must not be reopened by this milestone.

## Primary objective

Make Google-linked identity and Drive-backed archive persistence feel persistent to the player rather than requiring repeated manual authorization actions.

M4 does **not** redesign gameplay progression or deployment infrastructure. It focuses on one narrow product objective:

> A returning linked player can resume play and archive continuity with minimal prompts, while revoked or broken Google Drive authorization remains recoverable and never blocks gameplay.

## Product outcome

At M4 acceptance, a returning linked player should normally see:

```text
Google account: Connected
Drive archive: Connected
Last archive sync: <time/status>
```

Normal flow:

```text
restore linked player
  -> load gameplay immediately
  -> detect existing Drive authorization
  -> sync pending archive without new consent popup when possible
  -> keep gameplay usable regardless of Drive result
```

Reauthorization flow:

```text
stored authorization unusable / revoked
  -> mark Drive as Reauthorization required
  -> keep gameplay usable
  -> offer explicit Reconnect Google Drive action
  -> successful reconnect reopens pending archive retry
```

## Security boundary

M4 retains the M3 security model:

- Google login/session cookies remain Google-managed.
- Wanderloom stores provider `sub` -> `playerId` ownership in D1.
- Drive refresh tokens remain encrypted server-side.
- long-lived access tokens are not stored in browser state.
- Google passwords/session cookies are never stored by Wanderloom.
- Drive availability never becomes gameplay authority.

## Critical path

```text
v0.0.3 / M3 baseline
  |
  +-> CP-36 Drive Connection Status Contract
  |
  +-> CP-37 Web Persistence State Model
  |
  +-> CP-38 Existing Authorization Reuse
  |
  +-> CP-39 Reauthorization Classification
  |
  +-> CP-40 Nonblocking Drive Recovery UX
  |
  +-> CP-41 Best-Effort Archive Sync Trigger
  |
  +-> CP-42 Full M4 Acceptance
  |
  +-> M4 Seamless Persistence UX
```

## CP-36 — Drive Connection Status Contract

Objective:

Expose server-authoritative archive authorization state without returning credentials.

Candidate API:

`GET /api/archive/google/status`

Candidate response states:

```text
not_connected
connected
reauthorization_required
```

Possible metadata:

- granted scope
- authorized/updated timestamp
- latest archive sync outcome

Do not return:

- refresh token
- access token
- token ciphertext
- provider secrets

Exit criteria:

- provider state can be queried safely for the current player
- tests cover connected/not-connected state
- API contract follows CP-29 stable error rules

## CP-37 — Web Persistence State Model

Objective:

Represent account and Drive status independently from gameplay state.

Required properties:

- Google account state does not overload `busy`
- Drive errors cannot switch the whole app into gameplay error state
- connected/reconnect states survive normal UI rerenders
- account/archive status text has explicit semantics

Exit criteria:

- deterministic view-state tests
- restore never leaves stale action labels
- Drive operation failure remains local

## CP-38 — Existing Authorization Reuse

Objective:

Avoid unnecessary Google Drive consent popups when a stored encrypted refresh token remains usable.

Normal behavior:

```text
status = connected
  -> sync directly
  -> no authorization popup
```

Only request new authorization when server state says it is required.

Exit criteria:

- existing authorization can sync after browser reload
- no new popup is required for the normal connected path
- access token is refreshed server-side

## CP-39 — Reauthorization Classification

Objective:

Distinguish authorization loss from temporary provider/network errors.

Examples:

Reauthorization-required candidates:

- OAuth `invalid_grant`
- explicitly revoked/invalid refresh token

Retryable/provider candidates:

- HTTP 429
- HTTP 5xx
- transient network failure

Do not convert ordinary provider outages into repeated user consent requests.

Exit criteria:

- stable classification contract
- archive remains pending when recovery is possible
- authorization state changes only for actual credential invalidation

## CP-40 — Nonblocking Drive Recovery UX

Objective:

Give the player a clear recovery action without interrupting gameplay.

UI states:

```text
Drive archive: Connected
Drive archive: Sync pending
Drive archive: Temporarily unavailable
Drive archive: Reconnect required
```

Actions:

- Sync archive
- Reconnect Google Drive

Exit criteria:

- popup cancellation is local/nonblocking
- retry/reconnect can be performed without page reload
- exploration/start/claim remain available

## CP-41 — Best-Effort Archive Sync Trigger

Objective:

Reduce manual archive maintenance while preserving D1 gameplay authority.

Initial policy candidate:

- after successful claim, enqueue/attempt archive sync best-effort
- failure never rolls back claim
- duplicate delivery remains protected by archive idempotency and lease
- manual sync remains available as recovery/debug path

This CP should not introduce a complex scheduler unless required by measured usage.

Exit criteria:

- claim success is independent of Drive success
- pending archive eventually retries through defined trigger/recovery path
- concurrency/idempotency regressions stay green

## CP-42 — Full M4 Acceptance

Required automated regression:

- M2/M3 gameplay loop remains green
- Google link/restore remains green
- existing Drive authorization reuse
- no-popup connected sync
- invalid/revoked authorization -> reconnect-required
- transient Drive failure -> retryable, not reconnect-required
- archive lease/idempotency remains green
- typecheck/test/build green

Required browser smoke:

1. restore linked player
2. verify Drive shows Connected without new popup
3. start and claim exploration
4. verify archive sync succeeds without new consent
5. simulate/cause reconnect path where practical
6. cancel reconnect popup and confirm gameplay continues
7. retry reconnect and confirm archive recovery

## Explicit exclusions from M4

Keep these outside the M4 critical path:

### Deployment hardening

- staging/production environment separation
- remote migration rollout/rollback
- production telemetry policy
- deployment rollback runbook

These remain `P3-B`.

### Gameplay expansion

- new progression systems
- larger zone/content expansion
- equipment redesign
- item-loss/recovery gameplay
- Party/Caravan

These belong to a later gameplay milestone.

### Monetization

- advertising rollout
- rewarded ads
- payment/MOR

These remain separate until core UX is sufficiently stable.

## Mapping from Post-M3 handoff

The provisional `GID-01` through `GID-07` workstream is promoted into the numbered M4 critical path:

```text
GID-01 -> CP-36
GID-02 -> CP-37
GID-03 -> CP-38
GID-04 -> CP-39
GID-05 -> CP-40
GID-06 -> CP-41
GID-07 -> CP-42
```

No other Post-M3 workstream is promoted into M4 at this time.

## Proposed milestone name

**M4 — Seamless Persistence UX**

Provisional release mapping after acceptance:

`v0.0.4`

The version should remain provisional until CP-42 acceptance and main integration planning.

## Next action

After the v0.0.3 tag is fixed remotely:

1. merge this M4 planning document to main or an accepted planning branch,
2. create the M4 implementation branch from the v0.0.3 baseline,
3. start CP-36 only,
4. leave P3-B/P3-C/P3-D/P3-E outside the M4 critical path.
