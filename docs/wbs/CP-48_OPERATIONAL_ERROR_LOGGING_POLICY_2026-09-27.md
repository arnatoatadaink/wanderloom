# CP-48 — Operational Error / Logging Policy — 2026-09-27

## Status

**Accepted — structured logging/redaction contract validated**

## Objective

Define what Wanderloom may log in staging/production, how operational failures are classified, which correlation fields are allowed, and which credential/private fields must never appear in logs or release evidence.

## Principles

1. Logs are operational evidence, not request-body dumps.
2. Secret/provider credentials are never logged.
3. Unexpected exceptions are `error`.
4. Retryable provider failures and missing runtime configuration are `warn`.
5. Expected non-retryable client/domain failures are normally `info` unless escalation is separately justified.
6. Logging failure must never change gameplay authority or mutation semantics.
7. D1 remains gameplay authority; logging must not become required state.

## Structured fields allowed

Canonical fields are defined in `workers/api/src/operational-logging-policy.ts`.

Allowed top-level correlation/context fields:

- `level`
- `event`
- `requestId`
- `environment`
- `route`
- `method`
- `playerId`
- `errorCode`
- `provider`
- `retryable`
- sanitized `details`

`playerId` is operational correlation data, not a substitute for a real-world identity. Do not attach email address, Google subject, OAuth claims, archive payload content, or other unnecessary identity material.

## Canonical levels

### `error`

Use for unexpected exceptions and conditions indicating an implementation/infrastructure fault that is not represented by the expected API/domain error contract.

Examples:

- uncaught Worker exception,
- impossible repository invariant,
- unexpected D1 execution failure,
- serialization/parsing failure not caused by an ordinary invalid request.

### `warn`

Use for degraded but understood operational conditions.

Examples:

- retryable Google/Drive provider failure,
- required runtime configuration absent,
- deployment smoke failure,
- transient D1/provider unavailability represented by a known error path.

### `info`

Use for expected non-retryable failures or lifecycle facts when logging them is operationally useful.

Examples:

- expected invalid client request,
- linked account not found,
- already-claimed/domain conflict,
- release/deployment evidence recorded outside request execution.

Do not log every successful gameplay request merely because `info` exists. M5 prefers low-noise exception/degradation logging.

## Canonical events

The initial event vocabulary is:

- `request_failed`
- `provider_degraded`
- `configuration_missing`
- `deployment_smoke_failed`
- `unexpected_exception`

Add new event names only when they represent a stable operational category rather than a one-off message string.

## Forbidden log material

The code-level sanitizer rejects detail keys that indicate any of the following:

- authorization headers,
- cookies,
- credentials,
- passwords,
- client secrets,
- ID/access/refresh tokens,
- OAuth authorization codes,
- encrypted refresh-token ciphertext,
- generic token/secret material.

This applies even if a value is believed to be expired or test-only.

Examples that must never be emitted:

```text
Authorization: Bearer ...
GOOGLE_CLIENT_SECRET=...
ARCHIVE_TOKEN_ENCRYPTION_KEY=...
refreshToken=...
accessToken=...
idToken=...
credential=...
refreshTokenCiphertext=...
```

## Detail sanitization

`sanitizeOperationalLogDetails()` is fail-closed at the field-name level: keys matching forbidden credential/secret/token patterns are removed before a structured record is created.

The forbidden-key matcher is token-aware rather than raw-substring based so safe fields such as `statusCode` remain usable while `accessToken`, `clientSecret`, `authorizationCode`, and similar sensitive keys are rejected.

This is a defense-in-depth mechanism, not permission to pass arbitrary request bodies into the logger. Callers should still construct small allowlisted detail objects.

Good detail example:

```json
{
  "status": 503,
  "migrationName": "0006_google_drive_authorization.sql"
}
```

Bad detail example:

```json
{
  "requestBody": "...",
  "authorization": "Bearer ...",
  "refreshToken": "..."
}
```

## Request correlation

When request correlation is added to the Worker execution path, the preferred `requestId` source is an existing trusted edge/request identifier when available; otherwise generate an opaque random identifier.

Rules:

- never derive request IDs from credentials,
- never embed email/Google subject/token fragments,
- return/expose request IDs to clients only if a later API contract explicitly adopts that behavior,
- logging policy acceptance does not require changing current API response schemas.

## Environment context

Operational logs should distinguish `local`, `staging`, and `production`.

Environment identity must come from deployment/runtime configuration, not from a user-controlled request field.

## Error-code policy

Use stable API/domain error codes where available instead of arbitrary exception-message text.

Examples already present in the API include:

- `missing_player_id`
- `invalid_request`
- `linked_account_not_found`
- `invalid_google_credential`
- `invalid_google_drive_authorization`
- `google_drive_not_authorized`
- `not_ready`

Unexpected exception messages may contain sensitive/provider data and therefore must not be copied blindly into structured `details`.

## Google / Drive policy

Safe fields:

- provider category (`google_oidc` or `google_drive`),
- stable error code,
- retryable boolean,
- HTTP/provider status code when safe,
- request/environment correlation.

Forbidden fields:

- OAuth code,
- Google ID token,
- access token,
- refresh token,
- Google client secret,
- archive encryption key,
- encrypted refresh-token payload,
- raw provider response body unless explicitly sanitized in a future contract.

## D1 policy

Safe operational details may include:

- migration filename/name,
- known migration state,
- generic operation category,
- retryable classification.

Do not log SQL containing user data or full D1 row payloads as routine operational evidence.

## Deployment / smoke integration

CP-46 and CP-47 evidence may use the same policy:

- environment,
- source commit/tag,
- Worker deployment/version ID,
- smoke step name,
- pass/fail status,
- migration names/state,
- timestamp,
- request ID when relevant.

They must never contain secret values or provider tokens.

## Runtime integration boundary

The current Worker has no established structured logger and no pervasive `console.*` calls. CP-48 intentionally introduces the pure logging/redaction contract first rather than changing every route.

A later integration may wrap the top-level Worker request handler to emit sanitized records for uncaught exceptions and selected degraded paths. Such integration must preserve existing API responses and mutation behavior.

CP-48 acceptance therefore validates the logging policy contract itself; it does not claim that every runtime error path is already emitted to an external log sink.

## Local tests

`workers/api/src/operational-logging-policy.test.ts` verifies:

- level classification,
- forbidden-key detection,
- removal of secret/token fields,
- preservation of safe operational context,
- structured record creation.

## Acceptance evidence

Validated on 2026-09-28 from `feat/cp-48-operational-error-logging-policy`:

- API typecheck: PASS
- API tests: **31 files / 99 tests PASS**
- operational logging policy tests: **4 tests PASS**
- API Wrangler local build/dry-run: PASS
- upload size: 90.84 KiB / gzip 17.53 KiB
- local D1 binding resolved as `wanderloom-local`
- working tree: clean (`git status --short` produced no output)
- no remote Worker deploy performed
- no secret/provider credential values recorded in acceptance evidence

The initial validation exposed two implementation defects and both were corrected before acceptance:

1. `exactOptionalPropertyTypes` rejected explicitly passing `undefined` into optional classification fields; the implementation now constructs only defined optional properties.
2. raw substring redaction incorrectly classified `statusCode` as sensitive because of `code`; the matcher now operates on normalized key tokens so sensitive compound keys remain forbidden while safe operational keys remain available.

## Acceptance decision

**Accepted.**

All CP-48 acceptance requirements are satisfied:

1. API typecheck PASS,
2. all API tests PASS,
3. API Wrangler local build/dry-run PASS,
4. logging-policy tests PASS,
5. allowed correlation fields documented,
6. level/event vocabulary documented,
7. credential/token/secret fields fail closed under sanitization,
8. Google/Drive/D1 logging boundaries documented,
9. current runtime-integration limitation explicitly documented,
10. no real secret values appear in source, tests, logs, or acceptance evidence.

Runtime-wide structured log emission remains a future integration concern rather than an acceptance blocker for this policy contract.
