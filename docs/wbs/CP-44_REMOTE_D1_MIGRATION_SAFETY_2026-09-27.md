# CP-44 — Remote D1 Migration Safety — 2026-09-27

## Status

**Accepted / Complete**

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

Wrangler supports `d1 migrations list` and `d1 migrations apply` with `--remote`, `--config`, and `--env`. Database names are used instead of the generic `DB` binding name to reduce target ambiguity. Wrangler records applied migrations in `d1_migrations`.

## Tests

`workers/api/src/remote-d1-migration-safety.test.ts` verifies:

- staging and production database names are distinct,
- generated list/apply arguments include remote config and explicit environment,
- missing confirmation is rejected,
- wrong-environment confirmation is rejected,
- exact environment-specific confirmation is accepted.

## Acceptance evidence

Local acceptance on 2026-09-27:

- API typecheck: PASS
- API tests: **27 files / 85 tests PASS**
- Wrangler 4.132.0 local deploy dry-run: PASS
- local binding remains `env.DB (wanderloom-local)`
- generated remote Wrangler configuration remains outside Git
- migration command construction for staging/production is covered by regression tests
- staging `--apply` without exact confirmation failed closed before Wrangler execution with:
  `refusing remote migration apply; pass --confirm "APPLY wanderloom-staging"`
- no production migration was executed

A live remote `migrations list` is intentionally deferred until CP-45 provisions real staging/production D1 identifiers. CP-44 accepts the safety contract and fail-closed execution boundary; it does not require remote resource creation.

## Result

CP-44 is **Accepted / Complete**.

The next critical-path item is **CP-45 — Secret / Configuration Provisioning**, which owns real remote resource identifiers and environment-specific secret provisioning. Actual production migration remains an explicit release operation after the M5 runbook is complete.
