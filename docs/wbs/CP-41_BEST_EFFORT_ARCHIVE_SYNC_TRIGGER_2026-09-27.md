# CP-41 — Best-Effort Archive Sync Trigger — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Trigger Google Drive archive sync after a successful exploration claim without allowing Drive availability, OAuth state, or sync latency to affect the authoritative gameplay result.

## Accepted behavior

- Claim remains authoritative and completes independently of Drive.
- Best-effort archive sync is triggered only when cached Drive state is `connected` or `temporarily_unavailable`.
- `not_connected`, `reauthorization_required`, and `unknown` never trigger an automatic OAuth popup.
- Automatic archive sync failure is contained locally and does not roll back or replace the claim result.
- Drive status refresh after sync success/failure is also best-effort.
- Manual Drive sync/recovery remains available through the CP-40 recovery UX.
- Existing cached Drive connection state is reused; the claim path does not add a pre-sync status request.

## Implementation

Web helpers:

- `apps/web/src/best-effort-archive-sync.ts`
- `apps/web/src/best-effort-archive-api-client.ts`

Coverage:

- `apps/web/src/best-effort-archive-sync.test.ts`
- `apps/web/src/best-effort-archive-api-client.test.ts`

Production web bootstrap uses the best-effort archive API client so a successful `claimExploration()` can return immediately while Drive sync proceeds independently.

## Acceptance evidence

User-verified local validation on 2026-09-27:

```text
pnpm --filter @wanderloom/web typecheck
PASS

pnpm --filter @wanderloom/web test
Test Files  14 passed (14)
Tests       48 passed (48)
```

The accepted tests cover:

- connected authorization triggers best-effort sync,
- transient Drive state can retry without consent,
- missing/reconnect-required authorization skips automatic sync,
- sync failures do not reject the claim path,
- status refresh failures remain contained,
- claim-triggered sync uses cached status and does not add a blocking preflight request.

## Exit criteria

- claim result independent from Drive: **PASS**
- automatic OAuth popup prohibited on claim path: **PASS**
- Drive failures nonblocking: **PASS**
- no additional status preflight on claim: **PASS**
- typecheck and web regression suite green: **PASS**

## Result

CP-41 is **Accepted / Complete**.

Next critical-path item:

**CP-42 — Full M4 Acceptance**
