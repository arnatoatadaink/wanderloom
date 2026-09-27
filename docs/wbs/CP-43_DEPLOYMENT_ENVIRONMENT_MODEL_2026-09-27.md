# CP-43 — Deployment Environment Model — 2026-09-27

## Status

**Accepted / Complete**

## Objective

Define explicit local, staging and production deployment identities before remote resource provisioning begins.

CP-43 prevents an operational class of error in which staging and production silently share the same Worker or D1 resource.

## Environment matrix

| Environment | Worker name | D1 database name | Remote |
|---|---|---|---|
| local | `wanderloom-api-local` | `wanderloom-local` | no |
| staging | `wanderloom-api-staging` | `wanderloom-staging` | yes |
| production | `wanderloom-api` | `wanderloom-production` | yes |

Canonical code-level model:

- `workers/api/src/deployment-environment.ts`
- `workers/api/src/remote-wrangler-config.ts`

## Isolation rules

1. Worker names are unique across local/staging/production.
2. Database names are unique across local/staging/production.
3. Local is never classified as a remote deployment target.
4. Staging and production are remote deployment targets.
5. Actual staging and production D1 IDs must both be valid UUIDs and must differ.
6. No account-specific D1 IDs or secret values are committed.
7. Generated remote Wrangler configuration is written only below `workers/api/.wrangler/` and is ignored by Git.

## Wrangler configuration boundary

`workers/api/wrangler.jsonc` remains the local-development configuration and binds `DB` to `wanderloom-local`.

Remote account-specific configuration is generated locally with:

```bash
WANDERLOOM_STAGING_D1_ID=<staging-uuid> \
WANDERLOOM_PRODUCTION_D1_ID=<production-uuid> \
pnpm --filter @wanderloom/api config:remote
```

Output:

```text
workers/api/.wrangler/remote/wrangler.remote.json
```

The generated file is deliberately outside source control. The generator fails if either ID is malformed or if staging and production use the same D1 database ID.

## Validation evidence

User-local validation on WSL:

- `pnpm --filter @wanderloom/api typecheck`: PASS
- `pnpm --filter @wanderloom/api test`: PASS
  - 26 test files
  - 82 tests
- `pnpm --filter @wanderloom/api build`: PASS
- Wrangler 4.132.0 deploy dry-run: PASS
- local binding remained `env.DB (wanderloom-local)`
- `config:remote` generated `.wrangler/remote/wrangler.remote.json`: PASS
- generated `.wrangler` material is ignored by Git: PASS
- final worktree diff after generated config: none

The first remote-config test implementation attempted to use Node `child_process` inside the Cloudflare Vitest runtime and was rejected. It was replaced with a pure TypeScript configuration builder and Workers-compatible direct unit tests. The final 26-file / 82-test regression suite is green.

## Acceptance result

CP-43 establishes the environment identity and configuration-generation boundary required before any remote D1 mutation is allowed.

Actual remote D1 creation, migration preview/application and production safeguards remain intentionally deferred to CP-44/CP-45.

**CP-43: Accepted / Complete.**
