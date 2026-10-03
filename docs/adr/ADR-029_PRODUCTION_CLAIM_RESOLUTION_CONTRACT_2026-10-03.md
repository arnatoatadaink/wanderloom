# ADR-029 Production Claim Resolution Contract

- Status: Proposed
- Date: 2026-10-03

## Context

Production Zone start resolution is available, but claim resolution still depends on the M2 smoke runtime. Production reward values, failure probability, loss severity, and the initial production progression curve must be cut over without partially mixing the old M2 progression rule with production EXP.

## Decision

Introduce a production claim resolver contract before wiring it into the default API runtime.

The resolver:

- recognizes production Zone and duration pairs through the production catalog;
- uses the existing deterministic seeded outcome selection;
- injects authoritative production generated Gold and EXP values;
- uses the production risk-derived failure probability;
- uses `INITIAL_PRODUCTION_LOSS_POLICY`;
- subtracts fixed operational/travel Gold cost after success/failure retention;
- returns no generated drops in this PR so rarity/drop cutover remains isolated;
- returns `null` for non-production Zones so the smoke runtime can remain a fallback.

The seeded expedition resolver accepts optional generated reward overrides. Omitting those overrides preserves the existing smoke semantics.

## Runtime boundary

This PR deliberately does not switch the default API claim path yet. The current default API applies one global `progressionRule`, which is still the M2 smoke progression rule. Wiring production EXP into that path before selecting `INITIAL_PRODUCTION_PROGRESSION_RULE` per production exploration would create an inconsistent progression model.

The next wiring PR must atomically select both:

1. production claim resolution for production Zones; and
2. `INITIAL_PRODUCTION_PROGRESSION_RULE` for those same production claims.

## Compatibility

- M2 smoke generated Gold/EXP/drop defaults remain unchanged.
- M2 smoke deterministic outcome behavior remains unchanged.
- Production resolver returns no drops until the dedicated rarity/drop runtime PR.
- Zone Rank advancement remains owned by `calculateClaim` and therefore advances only on successful production Zone claims once the resolver is wired into the API.
