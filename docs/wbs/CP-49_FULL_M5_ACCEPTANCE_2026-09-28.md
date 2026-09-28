# CP-49 — Full M5 Acceptance — 2026-09-28

## Status

**Planned — starts after CP-48 merge**

## Objective

Perform the final M5 acceptance pass across CP-43 through CP-48, verify the release/deployment hardening contracts compose consistently, run the full regression gates, and define the M5 freeze/tag readiness decision without claiming remote deployment that has not occurred.

## Entry criteria

- CP-43 Deployment Environment Model Accepted.
- CP-44 Remote D1 Migration Safety Accepted.
- CP-45 Secret / Configuration Provisioning Accepted.
- CP-46 Deploy & Rollback Runbook Accepted.
- CP-47 Post-Deploy Health / Smoke Verification Accepted.
- CP-48 Operational Error / Logging Policy Accepted.

## Planned acceptance gates

1. full workspace typecheck,
2. full workspace test suite,
3. API Wrangler dry-run,
4. Web production build,
5. generated remote-config contract review,
6. migration safety contract review,
7. deploy/rollback command-contract review,
8. post-deploy smoke contract review,
9. logging/redaction contract review,
10. clean working tree and exact source SHA capture.

## Remote execution boundary

M5 may be accepted as a source/release-hardening milestone without provisioning real production resources. Real staging/production deployment, D1 migration apply, Worker rollback, and live smoke execution remain separately recorded operational evidence when intentionally performed.

No dummy D1 UUID, placeholder credential, or local secret may be promoted to a real remote environment.
