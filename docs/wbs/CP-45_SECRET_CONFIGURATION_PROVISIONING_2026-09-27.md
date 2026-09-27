# CP-45 — Secret / Configuration Provisioning — 2026-09-27

## Status

**In progress — inventory and provisioning contract implemented**

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

The D1 identifiers are not Worker secrets. They are consumed locally to generate the ignored `.wrangler/remote/wrangler.remote.json` used by Wrangler.

`VITE_GOOGLE_CLIENT_ID` is intentionally public browser configuration. `GOOGLE_CLIENT_SECRET` and `ARCHIVE_TOKEN_ENCRYPTION_KEY` must never be exposed to the Web build.

The canonical code-level inventory lives in:

- `workers/api/src/configuration-provisioning.ts`

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

## Local developer configuration

Templates:

- `workers/api/.dev.vars.example`
- `apps/web/.env.example`

Real local values belong only in:

- `workers/api/.dev.vars`
- `apps/web/.env.local`

Both are ignored by Git.

## Remote D1 configuration

Generate remote Wrangler configuration locally after provisioning separate D1 databases:

```bash
WANDERLOOM_STAGING_D1_ID=<staging-uuid> \
WANDERLOOM_PRODUCTION_D1_ID=<production-uuid> \
pnpm --filter @wanderloom/api config:remote
```

The generator rejects missing/malformed UUIDs and equal staging/production IDs.

## Worker secret provisioning

After the remote config exists, provision the three Worker secrets independently per environment.

Staging:

```bash
cd workers/api
pnpm exec wrangler secret put GOOGLE_CLIENT_ID \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json

pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json

pnpm exec wrangler secret put ARCHIVE_TOKEN_ENCRYPTION_KEY \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

Production uses the same commands with `--env production` and production values.

Do not place secret values on the command line. `wrangler secret put` should read the value interactively/stdin so it does not become shell history.

## Presence verification

List only secret names after provisioning:

```bash
cd workers/api
pnpm exec wrangler secret list \
  --env staging \
  --config .wrangler/remote/wrangler.remote.json
```

Repeat for `production` only when production provisioning is intentionally being performed.

Expected staging secret names:

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

`validateProvisioningPresence()` fails closed when any required Worker secret or Web build variable is absent. Tests also verify that staging and production secret commands always carry an explicit environment and generated config path.

At runtime, existing API routes already return `not_ready` for Google OIDC / Drive OAuth / Drive sync when required secret fields are absent, rather than silently attempting provider operations.

## Staging-first verification sequence

1. Create/provision `wanderloom-staging` D1.
2. Create/provision `wanderloom-production` D1 separately, but do not migrate production yet.
3. Generate remote Wrangler config locally from the two distinct UUIDs.
4. Provision staging Worker secrets.
5. Verify staging secret names with `wrangler secret list`.
6. Run safe migration preview:

```bash
pnpm --filter @wanderloom/api migrate:remote -- --target staging
```

7. Review pending migrations before any explicit staging apply.
8. Production provisioning remains a separate operator action.

## Tests

`workers/api/src/configuration-provisioning.test.ts` verifies:

- exact Worker secret inventory,
- exact public Web build-variable inventory,
- missing configuration fails closed,
- staging/production Wrangler secret commands are explicitly environment-targeted.

## Acceptance evidence required

Before CP-45 can be Accepted:

1. API typecheck PASS,
2. all API tests PASS,
3. local Wrangler dry-run PASS,
4. configuration inventory tests PASS,
5. `.dev.vars.example` contains names only and no real secret values,
6. `git status --short` is clean after local generated remote config use,
7. if real staging D1/resources are available: `wrangler secret list --env staging` shows all three names and `migrate:remote -- --target staging` can list migrations,
8. production secret/migration execution remains optional and explicit for CP-45 acceptance.

Real secret values must not be pasted into acceptance reports or committed artifacts.
