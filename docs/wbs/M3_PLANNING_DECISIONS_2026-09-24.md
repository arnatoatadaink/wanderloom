# M3 Planning Decisions — 2026-09-24

## Status

**Accepted**

## Baseline

- Release baseline: `v0.0.2`
- M2: complete
- M3 objective: **Productionized Persistent Solo Slice**

## Decisions

### D1 — M3 focuses on persistence productionization

M3 prioritizes:

- measured balance baseline
- stable API/error contracts
- guest → linked-account safety
- Google OIDC integration
- long-term archive export
- Google Drive appDataFolder synchronization
- retry/concurrency validation

Party, Caravan, monetization, permanent owned-equipment loss, and AI gameplay remain outside the M3 critical path.

### D2 — Google is the first OIDC provider

The account-linking domain remains provider-independent.

Google-specific concerns remain in the Worker/integration layer:

- OIDC discovery/authorization/token handling
- external subject mapping
- OAuth consent/scopes
- token validation/storage policy

The stable external identity key must use the provider namespace plus the provider's stable subject identifier rather than email as the primary identity key.

### D3 — Google Drive appDataFolder remains the first archive backend

The archive role is historical/long-term storage.

D1 remains authoritative for active gameplay state.

appDataFolder synchronization must therefore be asynchronous and must not be allowed to turn an already committed gameplay claim into a failed claim.

### D4 — Balance measurement is required; subjective final tuning is not

CP-28 establishes reproducible measurements and candidate configurations.

M3 does not require a claim that the game is finally balanced. It does require eliminating accidental/unmeasured configuration decisions where they materially affect the production persistence slice.

### D5 — Advertising remains outside M3

Advertising remains an intended future revenue path, but identity/archive reliability is completed first.

Advertising research may proceed in parallel but must not introduce dependencies into CP-28 through CP-35.

## Consequence

The accepted M3 critical path is CP-28 through CP-35 as defined in
`M3_PROPOSED_CRITICAL_PATH_2026-09-24.md`.
