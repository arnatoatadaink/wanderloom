# Full Profile Rarity Validation — 100k per Duration

Date: 2026-10-01
Status: Accepted for migration-candidate baseline; production resolver remains legacy-weighted

## Scope

- Profile: Full (all 7 rarities reachable)
- Iterations: 100,000 per duration
- Legacy: weighted resolver
- Candidate: Student's t resolver
- Short df=8
- Medium df=6
- Long df=5

Acceptance thresholds:

- Total variation distance <= 0.0200
- Max absolute per-tier probability delta <= 0.0150
- Absolute expected rarity score delta <= 0.0500

## Summary

| Duration | TV distance | Max tier delta | Expected rarity score Δ | Accepted |
| --- | ---: | ---: | ---: | --- |
| Short | 0.00812 | 0.00504 | -0.02958 | PASS |
| Medium | 0.00189 | 0.00098 | +0.00116 | PASS |
| Long | 0.00461 | 0.00327 | +0.01785 | PASS |

All three durations pass the initial migration-validation thresholds.

## Short — df=8

| Rarity | Legacy | Student-t | Candidate - Legacy |
| --- | ---: | ---: | ---: |
| Common | 54.891% | 55.199% | +0.308 pp |
| Uncommon | 24.852% | 25.356% | +0.504 pp |
| Rare | 12.196% | 12.162% | -0.034 pp |
| Epic | 5.054% | 4.846% | -0.208 pp |
| Legend | 1.971% | 1.785% | -0.186 pp |
| Mythic | 0.840% | 0.562% | -0.278 pp |
| Phantasm | 0.196% | 0.090% | -0.106 pp |

Cumulative tail deltas:

- Rare+: -0.812 pp
- Epic+: -0.778 pp
- Legend+: -0.570 pp
- Mythic+: -0.384 pp
- Phantasm: -0.106 pp

Interpretation: Short intentionally suppresses the upper tail relative to the legacy medium-reference distribution while keeping the overall distribution close.

## Medium — df=6

| Rarity | Legacy | Student-t | Candidate - Legacy |
| --- | ---: | ---: | ---: |
| Common | 55.101% | 55.049% | -0.052 pp |
| Uncommon | 24.933% | 24.872% | -0.061 pp |
| Rare | 11.955% | 12.053% | +0.098 pp |
| Epic | 4.981% | 4.973% | -0.008 pp |
| Legend | 1.952% | 2.043% | +0.091 pp |
| Mythic | 0.861% | 0.812% | -0.049 pp |
| Phantasm | 0.217% | 0.198% | -0.019 pp |

Cumulative tail deltas:

- Rare+: +0.113 pp
- Epic+: +0.015 pp
- Legend+: +0.023 pp
- Mythic+: -0.068 pp
- Phantasm: -0.019 pp

Interpretation: Medium reproduces the existing reference distribution very closely and acts as the calibration anchor.

## Long — df=5

| Rarity | Legacy | Student-t | Candidate - Legacy |
| --- | ---: | ---: | ---: |
| Common | 55.003% | 54.959% | -0.044 pp |
| Uncommon | 25.074% | 24.747% | -0.327 pp |
| Rare | 11.791% | 11.708% | -0.083 pp |
| Epic | 5.102% | 5.095% | -0.007 pp |
| Legend | 2.043% | 2.157% | +0.114 pp |
| Mythic | 0.778% | 1.017% | +0.239 pp |
| Phantasm | 0.209% | 0.317% | +0.108 pp |

Cumulative tail deltas:

- Rare+: +0.371 pp
- Epic+: +0.454 pp
- Legend+: +0.461 pp
- Mythic+: +0.347 pp
- Phantasm: +0.108 pp

Interpretation: Long increases the upper tail without materially shifting Common, which matches ADR-011/012 intent: longer duration should improve rarity opportunity rather than simply inflate visible Gold throughput.

## Agreement rate note

The same-rarity agreement rate is not an acceptance metric because legacy and candidate use different deterministic hash namespaces. The useful comparison is distribution-level distance and cumulative tail behavior.

Observed same-rarity rates were approximately:

- Short: 38.344%
- Medium: 38.277%
- Long: 38.093%

These values are informational only.

## Decision

1. Retain Student's t df=8/6/5 as the migration candidate baseline.
2. Mark Full-profile 100k validation as PASS.
3. Do not switch production yet; legacy-weighted remains authoritative.
4. Next gate should validate production-like zone definitions once those definitions are fixed.
5. A later production rollout should use explicit configuration/feature gating with immediate rollback to legacy-weighted.

## Production migration status

- Candidate mathematical model: ACCEPTED
- Shadow observability: ACCEPTED
- 10k representative-zone validation: ACCEPTED
- 100k Full-profile validation: ACCEPTED
- Production zone calibration: PENDING
- Production resolver cutover: NOT STARTED
