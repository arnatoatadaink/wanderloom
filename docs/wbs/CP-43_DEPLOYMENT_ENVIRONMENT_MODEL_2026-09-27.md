# CP-43 — Deployment Environment Model — 2026-09-27

## Status

**In progress — environment isolation contract implemented**

## Objective

Define explicit local, staging and production deployment identities before remote resource provisioning begins.

CP-43 prevents an operational class of error in which staging and production silently share the same Worker or D1 resource.

## Environment matrix

| Environment | Worker name | D1 database name | Remote |
|---|---|---|---|
| local | `wanderloom-api-local` | `wanderloom-local` | no |
| staging | `wanderloom-api-staging` | `wanderloom-staging` | yes |
| production | `wanderloom-api` | `wanderloom-production` | yes |

The canonical code-level model lives in:

- `workers/api/src/deployment-environment.ts`

## Isolation rules

1. Worker names must be unique across local/staging/production.
2. Database names must be unique across local/staging/production.
3. Local is never classified as a remote deployment target.
4. Staging and production are remote deployment targets.
5. Once actual D1 IDs are provisioned, staging and production database IDs must both be present and must differ.
6. No account-specific D1 IDs or secret values are committed by CP-43.

## Current Wrangler state

`workers/api/wrangler.jsonc` remains the existing local-development configuration and binds `DB` to `wanderloom-local`.

Remote named-environment bindings are intentionally not populated with fake IDs. Current Cloudflare Wrangler configuration requires D1 `database_id` for remote D1 bindings, so account-specific IDs will be introduced through the provisioning/configuration path rather than placeholder values in the active config.

## Cloudflare model alignment

The intended deployment shape follows Wrangler named environments:

```text
wrangler deploy --env staging
wrangler deploy --env production
```

Bindings such as D1 databases are environment-specific and must be explicitly defined for each named environment. CP-45 will own provisioning/config material after CP-44 defines remote migration safety.

## Tests

`workers/api/src/deployment-environment.test.ts` verifies:

- canonical names,
- uniqueness of Worker and database names,
- local/remote classification,
- missing remote IDs are rejected when provisioned targets are validated,
- equal staging/production database IDs are rejected.

## Remaining CP-43 work

Before CP-43 can be marked Accepted:

1. run API typecheck/tests,
2. confirm the environment model does not regress the M4 baseline,
3. define the generated/account-specific Wrangler remote configuration boundary without committing real IDs,
4. validate local Wrangler dry-run remains green.

Actual remote D1 creation and production/staging IDs are not required to be committed and belong to later M5 provisioning/migration steps.
