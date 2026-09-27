# CP-45 — Secret / Configuration Provisioning — 2026-09-27

## Status

**Planned / branch start pending CP-44 merge**

## Objective

Define how account-specific D1 identifiers and deployment secrets are provisioned into staging and production without committing them to Git.

## Scope

- staging/production D1 identifiers
- Google OAuth client configuration
- encrypted refresh-token key material
- Worker secret provisioning
- local developer secret boundary
- verification commands that expose names/status, never secret values

## Non-goals

- production deployment itself
- production D1 migration execution
- rollback procedure
- telemetry policy

## Security rules

1. No D1 UUID, OAuth client secret, encryption key, refresh token or access token is committed to Git.
2. `.dev.vars` remains local-only.
3. generated `.wrangler/` deployment material remains ignored.
4. staging and production use distinct remote D1 identifiers.
5. secret verification records only secret names/presence, never values.
6. production provisioning must be an explicit operator action.

## Expected deliverables

- canonical secret/config inventory
- staging/production provisioning runbook
- validation helper(s) that fail closed when required environment variables are absent
- remote Wrangler generation with real identifiers performed locally by operator
- remote `migrations list` verification after staging provisioning

## Entry criteria

- CP-43 Accepted
- CP-44 Accepted

## Exit criteria

- required secret/config inventory fixed
- no secret values committed
- staging and production resource IDs demonstrably distinct
- staging provisioning procedure locally reproducible
- real staging `d1 migrations list` can be performed after provisioning
- production provisioning remains explicit and separately confirmed
