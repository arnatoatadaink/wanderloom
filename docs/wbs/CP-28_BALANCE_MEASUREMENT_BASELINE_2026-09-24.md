# CP-28 Balance Measurement Baseline — Implementation — 2026-09-24

## Status

**In progress**

## Objective

Turn the CP-24 single-scenario simulator into a reproducible multi-scenario measurement baseline for the four provisional M2 zone/duration choices.

CP-28 measures current behavior. It does not declare the current values balanced.

## Added measurement contract

A named balance scenario now contains:

- scenario ID
- duration in milliseconds
- existing deterministic balance simulation input

The scenario report adds:

- retained Gold per minute
- retained EXP per minute
- generated drops per minute
- retained drops per minute
- generated rarity rates

Multiple scenarios can be measured in stable input order and duplicate scenario IDs are rejected.

## Current M2 scenario set

The Worker regression constructs four measurements from the accepted v0.0.2 smoke configuration:

1. `m1-smoke-frontier/short`
2. `m1-smoke-frontier/long`
3. `m2-moss-hollow/short`
4. `m2-moss-hollow/long`

Each scenario uses 1,000 deterministic iterations.

## Structural baseline findings

These are code/configuration-derived findings; exact seeded rates still require the local test run.

### Gold / EXP duration differentiation

The current production resolver generates the same per-run Gold range and EXP amount independent of duration.

Therefore:

- short and long do not currently differ in generated Gold/EXP per run
- long takes twice the configured time
- time-normalized retained Gold/EXP throughput is therefore lower for long runs

This is a **measurement finding**, not yet a balance defect classification.

### Drop throughput

Current smoke configuration is:

- short: 1 generated drop / 5 minutes
- long: 2 generated drops / 10 minutes

Therefore generated drop throughput per minute is structurally equal between short and long.

### Rarity differentiation

Current provisional zones differ by reachable rarity families:

- M1 Smoke Frontier: Common / Rare
- Moss Hollow: Uncommon / Epic

Long duration also changes rarity weighting within each zone.

## Scope boundary

CP-28 does not yet:

- approve production balance values
- change failure probability
- change Gold/EXP retention
- change progression thresholds
- change rarity weights
- change zone names/content
- change duration values

Any tuning must follow measured evidence.

## Validation required

Before CP-28 acceptance, run:

- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`
- `git diff --check`

Expected test-count increase from v0.0.2 baseline:

- game-core: +3 tests
- Worker: +3 tests
- Web: unchanged

If all tests are discovered, the expected total is **87 tests**.

## Exit criteria

CP-28 can close when:

- named scenario measurement API typechecks
- scenario measurement tests pass
- all four M2 choices are covered
- current structural differentiation findings remain reproducible
- v0.0.2 regressions remain green
- complete workspace validation passes

Next CP after acceptance: **CP-29 Production Contract Hardening**.
