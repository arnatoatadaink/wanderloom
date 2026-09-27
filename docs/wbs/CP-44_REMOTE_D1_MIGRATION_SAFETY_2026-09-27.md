# CP-44 — Remote D1 Migration Safety — 2026-09-27

## Status

**In progress — guarded remote migration workflow implemented**

## Objective

Prevent accidental D1 migration execution against the wrong remote environment while keeping staging and production migration procedures reproducible.

## Safety contract

1. Remote migration commands require an explicit `--target staging|production`.
2. Commands use the immutable D1 database name rather than the `DB` binding name.
3. The default action is `migrations list`; it does not mutate the database.
4. Actual application requires `--apply` plus an exact target-specific confirmation phrase.
5. The confirmation phrase for staging cannot authorize production and vice versa.
6. Commands always include `--remote`, `--config <generated remote config>`, and `--env <target>`.
7. The generated remote Wrangler configuration must already exist; account-specific D1 IDs remain outside Git.
8. Production application remains an explicit operator action; CP-44 does not automatically migrate a live database.

## Canonical targets

| Target | Database name | Apply confirmation |
|---|---|---|
| staging | `wanderloom-staging` | `APPLY wanderloom-staging` |
| production | `wanderloom-production` | `APPLY wanderloom-production` |

The code-level contract is in:

- `workers/api/src/remote-d1-migration-safety.ts`

## Commands

First generate the account-specific remote config:

```bash
WANDERLOOM_STAGING_D1_ID=<staging-uuid> \
WANDERLOOM_PRODUCTION_D1_ID=<production-uuid> \
pnpm --filter @wanderloom/api config:remote
```

Preview unapplied staging migrations (safe default):

```bash
pnpm --filter @wanderloom/api migrate:remote -- --target staging
```

Apply staging migrations only after reviewing the list:

```bash
pnpm --filter @wanderloom/api migrate:remote -- \
  --target staging \
  --apply \
  --confirm "APPLY wanderloom-staging"
```

Preview production:

```bash
pnpm --filter @wanderloom/api migrate:remote -- --target production
```

Production apply requires a separate explicit confirmation:

```bash
pnpm --filter @wanderloom/api migrate:remote -- \
  --target production \
  --apply \
  --confirm "APPLY wanderloom-production"
```

## Cloudflare behavior relied upon

Current Wrangler supports `d1 migrations list` and `d1 migrations apply` with `--remote`, `--config`, and `--env`. Cloudflare documents that database names are preferable to binding names when avoiding accidental migration of the wrong binding. Wrangler also records applied migrations in `d1_migrations` and captures a backup when applying migrations.

## Tests

`workers/api/src/remote-d1-migration-safety.test.ts` verifies:

- staging and production database names are distinct,
- generated list/apply arguments include remote config and explicit environment,
- missing confirmation is rejected,
- wrong-environment confirmation is rejected,
- exact environment-specific confirmation is accepted.

## Acceptance evidence required

Before CP-44 can be Accepted:

1. API typecheck PASS,
2. all API tests PASS,
3. Wrangler local dry-run PASS,
4. generated remote config remains ignored by Git,
5. safe staging preview command reaches Wrangler with the expected staging target,
6. an apply attempt without the exact confirmation fails before Wrangler executes,
7. no real production migration is required for CP-44 acceptance.

Remote D1 provisioning itself belongs to CP-45. Actual production migration is an operational release action after the M5 runbook is complete.
