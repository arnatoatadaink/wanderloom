# CP-45 — Secret / Configuration Provisioning — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Define how account-specific D1 identifiers and deployment secrets are provisioned into staging and production without committing them to Git.

## Canonical inventory

Worker runtime secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ARCHIVE_TOKEN_ENCRYPTION_KEY`

Public Web build variable:

- `VITE_GOOGLE_CLIENT_ID`

Environment-specific remote configuration values:

- `WANDERLOOM_STAGING_D1_ID`
- `WANDERLOOM_PRODUCTION_D1_ID`

The D1 identifiers are not Worker secrets. They are consumed locally to generate ignored Wrangler configuration under `workers/api/.wrangler/remote/`.

`VITE_GOOGLE_CLIENT_ID` is intentionally public browser configuration. `GOOGLE_CLIENT_SECRET` and `ARCHIVE_TOKEN_ENCRYPTION_KEY` must never be exposed to the Web build.

## Source-derived configuration requirements

The Worker `ApiEnv` currently reads exactly three optional secret fields:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ARCHIVE_TOKEN_ENCRYPTION_KEY`

The Web entrypoint reads `import.meta.env.VITE_GOOGLE_CLIENT_ID` and passes it to Google Identity Services.

The archive token cipher requires `ARCHIVE_TOKEN_ENCRYPTION_KEY` to decode to exactly 32 bytes before AES-GCM use. Therefore production/staging provisioning must use a valid Base64-encoded 32-byte key.

## Security rules

1. No D1 UUID, OAuth client secret, encryption key, refresh token or access token is committed to Git.
2. `.dev.vars` remains local-only.
3. generated `.wrangler/` deployment material remains ignored.
4. staging and production use distinct remote D1 identifiers.
5. secret verification records only secret names/presence, never values.
6. production provisioning must be an explicit operator action.
7. staging and production should use independent `ARCHIVE_TOKEN_ENCRYPTION_KEY` values unless an intentional migration/restore plan requires otherwise.
8. changing an archive encryption key invalidates the ability to decrypt existing stored refresh tokens unless those tokens are re-encrypted or reauthorized; key rotation is therefore an operational migration, not a routine deploy edit.
9. dummy UUIDs used for local config-generation tests must never be used for a real remote deploy.

## Local developer configuration

Templates:

- `workers/api/.dev.vars.example`
- `apps/web/.env.example`

Real local values belong only in:

- `workers/api/.dev.vars`
- `apps/web/.env.local`

Both are ignored by Git.

## Remote Wrangler configuration

After separate remote D1 databases are provisioned, generate the normal remote config locally:

```bash
WANDERLOOM_STAGING_D1_ID=<real-staging-uuid> \
WANDERLOOM_PRODUCTION_D1_ID=<real-production-uuid> \
pnpm --filter @wanderloom/api config:remote
```

This writes:

```text
workers/api/.wrangler/remote/wrangler.remote.json
```

The normal config declares the three Worker secrets through `secrets.required`. The generator rejects missing/malformed UUIDs and equal staging/production IDs.

## First-time Worker bootstrap

A first-time environment has an ordering problem: the normal config requires secrets at deploy time, but `wrangler secret put/list` requires the target Worker to already exist.

For first creation only, generate a bootstrap config that keeps the same Worker and D1 identities but intentionally omits `secrets.required`:

```bash
WANDERLOOM_STAGING_D1_ID=<real-staging-uuid> \
WANDERLOOM_PRODUCTION_D1_ID=<real-production-uuid> \
pnpm --filter @wanderloom/api config:remote:bootstrap
```

This writes:

```text
workers/api/.wrangler/remote/wrangler.bootstrap.json
```

Create the staging Worker only after real D1 IDs exist. The bootstrap deploy is a one-time provisioning step and must not be used for normal releases.

## Worker secret provisioning

After the Worker exists, provision the three Worker secrets independently per environment using the normal remote config path. Do not place secret values on the command line; Wrangler should read them interactively/stdin so values do not appear in shell history.

After all three secrets exist, deploy the normal config so `secrets.required` becomes active. Production uses the same sequence only as an explicit, separately approved operator action.

## Presence verification

Use `wrangler secret list --format json --env <target> --config <normal-config>` to verify names only.

Expected names:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
ARCHIVE_TOKEN_ENCRYPTION_KEY
```

No validation log should contain the corresponding values.

## Web build configuration

The Web build requires the matching Google OAuth Web application client ID:

```text
VITE_GOOGLE_CLIENT_ID=<google-web-client-id>
```

This value is public by design and becomes part of the browser bundle. It must correspond to the same Google OAuth client identity expected by the Worker environment.

## Configuration diagnostics

`validateProvisioningPresence()` fails closed when any required Worker secret or Web build variable is absent. Tests verify the expected secret-name set and explicit staging/production targeting.

The generated normal remote config declares `secrets.required`; the generated bootstrap config intentionally omits it. At runtime, existing API routes return `not_ready` for Google OIDC / Drive OAuth / Drive sync when required secret fields are absent rather than silently attempting provider operations.

## Staging-first verification sequence

1. Create `wanderloom-staging` and `wanderloom-production` D1 databases separately and record the real UUIDs locally.
2. Generate both normal and bootstrap remote configs from those real UUIDs.
3. One-time bootstrap-deploy only the staging Worker.
4. Provision the three staging Worker secrets.
5. Verify the three secret names with `wrangler secret list`.
6. Deploy the staging Worker with the normal config.
7. Run the safe migration preview.
8. Review pending migrations before any explicit staging apply.
9. Production provisioning remains a separate operator action.

## Acceptance evidence

Accepted on 2026-09-27 with the following evidence supplied from the local WSL environment:

- API typecheck: PASS
- API tests: **28 files / 89 tests PASS**
- local Wrangler 4.132.0 deploy dry-run: PASS
- generated normal remote config: PASS
- generated bootstrap config: PASS
- normal config contains `secrets.required` with exactly:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `ARCHIVE_TOKEN_ENCRYPTION_KEY`
- bootstrap config contains no `secrets` block: PASS
- generated `.wrangler` material remains ignored by Git: PASS
- `git status --short`: clean
- attempted staging `secret list` correctly reported that `wanderloom-api-staging` does not yet exist remotely; this is expected before first-time bootstrap
- no real remote D1 UUIDs, OAuth secret values, encryption key values, refresh tokens, or access tokens were committed or pasted into the acceptance record
- no production secret provisioning, migration, or deployment was performed

## Deferred operational evidence

Real staging D1 creation, one-time Worker bootstrap, staging secret provisioning, staging migration preview, and normal staging deployment remain intentionally deferred until the deployment runbook is exercised. These are operational release actions and are covered by the next M5 stages rather than source-contract acceptance.

Production provisioning remains explicit and separately approved.
