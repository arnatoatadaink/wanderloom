# CP-40 — Nonblocking Drive Recovery UX — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Provide clear Google Drive archive recovery actions without interrupting gameplay or converting Drive failures into global gameplay errors.

## Accepted behavior

Drive persistence state is represented independently from gameplay state.

### Connected

```text
Drive archive: Connected
Action: Sync archive
```

Existing authorization is reused; no OAuth popup is required.

### Temporarily unavailable

```text
Drive archive: Temporarily unavailable
Action: Retry Drive archive
```

Transient provider failures reuse the existing authorization path and do not force a new consent popup.

### Reauthorization required

```text
Drive archive: Reconnect required
Action: Reconnect Google Drive
```

A new OAuth authorization is requested only when CP-39 has classified the stored authorization as unusable.

### Not connected

```text
Drive archive: Not connected
Action: Enable Drive archive
```

The enable action is shown only when the Google account is connected.

## Nonblocking gameplay boundary

Drive operations now use a dedicated local `driveBusy` flag instead of the gameplay-wide `busy` state.

Consequences:

- opening the Drive authorization popup does not move the app into a gameplay loading/error state,
- popup cancellation remains local to archive recovery,
- Drive sync failure does not set `phase: error`,
- exploration/start/claim state remains authoritative and independent,
- stored returning players can see and operate Drive recovery controls once Drive state is known.

## Recovery refresh behavior

After archive sync success or failure, the app refreshes the server-authoritative Drive connection status so CP-39 transitions such as:

```text
connected -> reauthorization_required
```

are reflected immediately in the UI.

## Consent-loop prevention

`temporarily_unavailable` now follows the existing-authorization reuse path rather than the authorization-request path.

This prevents HTTP 429/5xx/network outages from repeatedly presenting Google consent UI.

## Acceptance evidence

User-verified local validation on 2026-09-27:

```text
pnpm --filter @wanderloom/web typecheck
PASS

pnpm --filter @wanderloom/web test
Test Files  12 passed (12)
Tests       38 passed (38)
```

Coverage includes:

- connected archive sync without OAuth popup,
- not-connected authorization then sync,
- temporarily-unavailable retry without OAuth popup,
- reauthorization-required popup cancellation stops before authorize/sync,
- explicit recovery labels for connected/transient/reconnect states,
- existing web regression suites remain green.

## Exit criteria

- popup cancellation is local/nonblocking: **PASS**
- retry/reconnect can be performed without page reload: **PASS**
- exploration/start/claim remain independent of Drive recovery state: **PASS**
- transient provider outage does not trigger new consent: **PASS**
- typecheck and web regressions green: **PASS**

## Result

CP-40 is **Accepted / Complete**.

Next critical-path item:

**CP-41 — Best-Effort Archive Sync Trigger**
