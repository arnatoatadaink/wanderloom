# M5 — Release & Deployment Hardening Definition — 2026-09-27

## Status

**Active planning / implementation start**

## Objective

Turn the accepted `v0.0.4` source baseline into a repeatable and safer deployment baseline without changing gameplay semantics.

M5 focuses on operational correctness: environment isolation, migration safety, secrets/configuration, rollback, deploy verification, and non-secret operational diagnostics.

## Baseline

- source baseline: `v0.0.4`
- tag target: `ba154ed6b7cab1caf1a7989a665c501003a3e060`
- current synchronized main after documentation finalization: `45c8d5b82cb93c2431d7946bfb5fa9a61264719d`
- migrations: 0001–0006
- regression baseline: 57 files / 189 tests PASS
- browser recovery baseline: 6 Chromium tests PASS

## Critical path

```text
CP-43  Deployment Environment Model
  ↓
CP-44  Remote D1 Migration Safety
  ↓
CP-45  Secret / Configuration Provisioning Contract
  ↓
CP-46  Deploy & Rollback Runbook
  ↓
CP-47  Post-Deploy Health / Smoke Verification
  ↓
CP-48  Operational Error / Logging Policy
  ↓
CP-49  Full M5 Acceptance
```

## CP-43 — Deployment Environment Model

Define explicit local/staging/production environment boundaries.

Required outcomes:

- Wrangler configuration has unambiguous environment-specific bindings/resource names.
- staging and production must not silently share the same D1 database.
- local development keeps existing local workflow usable.
- environment selection is explicit in documented deploy commands.
- configuration structure is testable/static-checkable where practical.

Exit criteria:

- environment matrix documented,
- config changes type/build clean,
- dry-run succeeds for intended deploy targets without deploying.

## CP-44 — Remote D1 Migration Safety

Define and validate the remote migration procedure.

Required outcomes:

- inspect pending migrations before apply,
- explicit target environment/database,
- backup/export consideration documented,
- apply command and verification command documented,
- failure/partial-apply handling documented,
- no automatic production migration as a side effect of ordinary app deploy unless later explicitly approved.

## CP-45 — Secret / Configuration Provisioning Contract

Required outcomes:

- inventory required secrets/vars per environment,
- distinguish public web build variables from Worker secrets,
- provisioning/check procedure,
- no secret values committed,
- missing critical config produces clear startup/deploy diagnostics.

## CP-46 — Deploy & Rollback Runbook

Required outcomes:

- staging-first deployment sequence,
- production deployment sequence,
- source/tag identity recorded at deployment time,
- Worker rollback procedure,
- web rollback procedure if separate,
- database schema rollback limitations explicitly stated.

## CP-47 — Post-Deploy Health / Smoke Verification

Required outcomes:

- deterministic post-deploy smoke checklist,
- guest bootstrap/state/start/claim path,
- linked identity/Drive checks where safe and available,
- migration version verification,
- health/smoke failures block release completion.

## CP-48 — Operational Error / Logging Policy

Required outcomes:

- stable operational event categories,
- correlation/request identifiers where practical,
- useful error context without credentials,
- explicit redaction/exclusion rules for identity and OAuth materials,
- low-cost logging suitable for initial Workers deployment.

## CP-49 — Full M5 Acceptance

Aggregate acceptance should include:

- all M4 regressions still green,
- all new deployment/config tests green,
- staging/production dry-run/config validation green,
- migration procedure exercised against a non-production target where practical,
- secret inventory/checklist complete,
- deploy/rollback and smoke runbooks complete,
- no committed secret material,
- final M5 acceptance record.

## Excluded from M5

M5 does not add:

- gameplay/content expansion,
- party/caravan mechanics,
- monetization,
- archive browsing/history UX,
- aggressive automatic archive retry scheduling,
- production deployment itself unless explicitly chosen during acceptance.

## Release expectation

If CP-43 through CP-49 are accepted, M5 may become the basis for provisional `v0.0.5`.

The exact release/tag decision remains separate from implementation acceptance.
