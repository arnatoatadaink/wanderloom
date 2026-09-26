# Post-M3 Google Identity / Drive Persistence UX Plan — 2026-09-26

## Status

**Planned / Post-M3 candidate**

This document records the follow-up design after CP-35 browser acceptance.
It does not block M3 acceptance because the existing M3 implementation already
persists the Google identity link and Drive refresh token, and the CP-35 smoke
confirmed successful restore, archive sync, and continued gameplay.

## Background

During CP-35 manual acceptance the following behavior was observed:

1. Google restore succeeded.
2. The restored screen initially remained in `Starting…` until refresh.
3. Claim completed successfully, but `Claiming…` was observed temporarily.
4. Closing the Google Drive authorization popup produced a full
   `CONNECTION / STATE ERROR` screen.
5. Retrying Drive authorization succeeded and archive sync completed.
6. Gameplay remained usable after successful archive sync.

The first and fourth issues were corrected during CP-35 in a separate code
commit:

`38dbefcf0307c3a797e79f6932a953c416ed7a11`

`fix(web): clear restore busy state and isolate Drive popup failures`

The fix:

- clears the Web `busy` state after remote state reload / Google restore;
- keeps a Drive popup/authorization failure local to the archive panel instead
  of replacing the entire game screen with a global connection error.

The corrected browser smoke subsequently passed.

## Current M3 persistence model

### Google account identity

Wanderloom persists the account relationship in D1 through the external
identity link model:

```text
provider = google
subject  = Google stable subject (`sub`)
playerId = Wanderloom player ID
```

The Wanderloom identity relationship therefore does not depend on the user's
email address and does not need Wanderloom to store a Google login cookie.

The browser may benefit from an existing Google session managed by Google, but
Google session cookies remain Google-owned browser state. Wanderloom should
not attempt to copy, reproduce, or persist Google's login cookies.

### Google Drive authorization

Migration `0004_google_drive_authorizations.sql` already stores Drive
authorization per player:

- encrypted refresh-token ciphertext;
- encryption IV;
- granted OAuth scope;
- authorization/update timestamps.

The Worker OAuth client already supports both:

- authorization-code exchange;
- access-token refresh from the stored refresh token.

Therefore the M3 backend already has the core mechanism required for
persistent Drive authorization. A fresh popup should not be required for every
archive sync while the stored refresh token remains valid and authorized.

### Browser-local state

The Web client currently stores the Wanderloom `playerId` in local storage.
This is a convenience pointer, not the authoritative account identity.

The authoritative relationship remains in D1 and can be restored through the
Google stable subject.

## Problem statement

The remaining issue is primarily **authorization-state discovery and UX**, not
missing persistence infrastructure.

At present the Web UI can show an `Enable Drive archive` action based on local
session/UI state even when the server already has a valid Drive authorization.
This can cause unnecessary popup requests and makes the user infer connection
state from previous actions rather than from authoritative server state.

The desired UX is:

```text
Google identity
  linked / restored
       |
       v
Drive authorization status from Worker
  connected  -> archive sync can run without popup
  missing    -> show Enable Drive archive
  revoked    -> show Reconnect Google Drive
  transient failure -> keep gameplay available and retry later
```

## Design principles

1. **D1 is authoritative for Wanderloom identity and Drive authorization
   metadata.**
2. **Google owns the Google-login browser session.** Wanderloom does not store
   Google cookies.
3. **Refresh tokens remain server-side only.** They must never be returned to
   Web code, localStorage, sessionStorage, or application cookies.
4. **Access tokens remain ephemeral.** Refresh them server-side when required
   and do not persist them unless a later design demonstrates a concrete need.
5. **Archive availability must not block gameplay.** Archive errors are a
   secondary-service condition.
6. **Reauthorization is exceptional.** It is requested only when no usable
   server authorization exists or Google reports that authorization is no
   longer usable.
7. **The Google stable `sub`, not email, remains the account key.**

## Proposed implementation

### P1 — Add an authorization-status API

Add a read-only endpoint, for example:

```text
GET /api/archive/google/status
```

Suggested response:

```json
{
  "ok": true,
  "drive": {
    "status": "connected",
    "grantedScope": "https://www.googleapis.com/auth/drive.appdata",
    "authorizedAt": "...",
    "updatedAt": "..."
  }
}
```

The endpoint must not expose:

- refresh-token ciphertext;
- refresh token;
- IV;
- access token;
- client secret;
- encryption key.

Recommended statuses:

```text
not_connected
connected
reauthorization_required
```

`connected` initially means that a stored authorization exists and has not been
marked unusable. It does not require issuing a Google token request on every
page load.

### P2 — Represent Drive authorization state explicitly in the Web view model

Introduce an explicit UI state instead of deriving availability only from the
fact that Google account linking occurred.

Example:

```text
unknown
not_connected
connected
reauthorization_required
checking
syncing
error
```

After Google restore/link and normal remote-state loading, fetch the Drive
status once.

Expected UI:

```text
Google account: Linked
Drive archive: Connected
Last archive result: ...
```

When connected, do not present `Enable Drive archive` as the primary action.

### P3 — Rename authorization actions according to state

Use state-specific actions:

```text
not_connected
  -> Enable Drive archive

connected
  -> Sync archive now       (optional/manual fallback)

reauthorization_required
  -> Reconnect Google Drive
```

This makes it clear that OAuth consent is not expected on every sync.

### P4 — Use the stored refresh token for ordinary sync

Normal archive synchronization should call the Worker sync endpoint directly.
The Worker should:

1. load encrypted Drive authorization by player ID;
2. decrypt the refresh token server-side;
3. exchange it for an access token;
4. deliver pending archive exports to `appDataFolder`;
5. retain existing CP-33 retry/idempotency and CP-34 lease semantics.

No browser popup is involved in this normal path.

### P5 — Classify authorization failures

Differentiate authorization-invalid conditions from temporary Drive failures.

Suggested behavior:

```text
invalid_grant / authorization revoked / refresh token unusable
  -> mark Drive authorization reauthorization_required
  -> keep archive pending
  -> show Reconnect Google Drive

HTTP 429 / 5xx / network/provider transient failure
  -> keep authorization connected
  -> retain retryable archive state
  -> do not request consent again
```

Do not treat every Drive failure as evidence that OAuth authorization is
invalid.

### P6 — Preserve gameplay state on all archive-only failures

The CP-35 fix already establishes this direction.

Drive popup closure, OAuth exchange failure, Drive API failure, or archive
retry failure must not transition the whole application into the global game
error phase when gameplay state itself is healthy.

Archive errors should be shown inside the account/archive panel.

### P7 — Optional automatic sync

After authorization-state UX is stable, add best-effort automatic archive sync
at a controlled trigger, for example:

- after a successful claim; or
- once after application restore/load when pending archive exists.

Recommended first implementation:

```text
claim succeeds
  -> gameplay response completes normally
  -> best-effort archive sync begins separately
```

The archive result must never roll back a successful claim.

This preserves the M3 contract established by CP-32 through CP-34.

## Cookie policy

### Do not store Google OAuth credentials in Wanderloom cookies

Do not place the following in application cookies:

- Google ID token;
- access token;
- refresh token;
- client secret.

Reasons:

- unnecessary token duplication;
- browser exposure and lifecycle complexity;
- cookie-size and cross-origin concerns;
- the existing Worker/D1 encrypted refresh-token architecture already solves
  persistence at the appropriate trust boundary.

### Application session cookie — optional later work

A Wanderloom-owned HttpOnly/Secure/SameSite session cookie could be introduced
in a future auth-hardening milestone to replace direct browser use of the
player ID as the request credential/pointer.

That is a separate security/authentication design decision and is not required
for the Drive persistence improvement described here.

## Data model impact

The first iteration requires no migration if status is inferred from existence
of the current `google_drive_authorizations` row.

A later migration may be useful if explicit lifecycle state is required, for
example:

```text
status                    connected | reauthorization_required
last_verified_at
last_authorization_error
```

Do not add these fields until behavior requires them.

## Test plan

### Worker tests

Add coverage for:

1. status endpoint returns `not_connected` without an authorization row;
2. status endpoint returns `connected` with an authorization row;
3. status response never exposes token material;
4. normal archive sync uses stored refresh authorization without a new code;
5. invalid refresh authorization becomes `reauthorization_required`;
6. transient provider failure does not become `reauthorization_required`;
7. archive failure does not mutate gameplay state.

### Web tests

Add coverage for:

1. restored linked player + connected Drive -> `Drive archive connected`;
2. connected Drive does not show `Enable Drive archive` as if first-time;
3. missing Drive authorization -> `Enable Drive archive`;
4. revoked/unusable authorization -> `Reconnect Google Drive`;
5. popup closed -> local archive error only;
6. archive error does not lock Start/Claim/gameplay controls;
7. retry succeeds without page refresh.

### Manual acceptance

```text
Browser A
  restore Google account
  -> Drive shows Connected
  -> start/claim works
  -> pending archive syncs without OAuth popup

Browser B / cleared Wanderloom localStorage
  restore same Google account
  -> same player restored
  -> Drive status recovered from server
  -> normal sync does not require a new consent popup

Revoke Google app/Drive authorization externally
  -> next relevant authorization use detects failure
  -> gameplay remains available
  -> UI offers Reconnect Google Drive
```

## Proposed work breakdown

Recommended Post-M3 sequence:

```text
GID-01  Drive authorization status contract/API
GID-02  Web authorization-state model and status display
GID-03  Sync-without-popup normal path UX
GID-04  Reauthorization-required classification
GID-05  Web/Worker regression tests
GID-06  Cross-browser restore + Drive persistence acceptance
GID-07  Optional best-effort automatic archive sync
```

Dependencies:

```text
GID-01
  -> GID-02
  -> GID-03
       -> GID-04
       -> GID-05
       -> GID-06

GID-07 after GID-03..06 are stable
```

## Priority / release recommendation

This work is recommended as an **early Post-M3 UX/auth hardening slice**.

It should not reopen the M3 critical path because:

- identity persistence already works;
- encrypted refresh-token persistence already works;
- real appDataFolder delivery already works;
- CP-35 final browser smoke passed after the UI state fix.

The remaining work primarily removes unnecessary authorization prompts and
makes the UI reflect the existing persistent backend state correctly.

## Existing fixes kept separate

The observed CP-35 state-recovery issues were already fixed in their own code
commit and are intentionally not mixed with this planning document:

```text
38dbefcf0307c3a797e79f6932a953c416ed7a11
fix(web): clear restore busy state and isolate Drive popup failures
```

This report is documentation/planning only and should remain a separate commit.
