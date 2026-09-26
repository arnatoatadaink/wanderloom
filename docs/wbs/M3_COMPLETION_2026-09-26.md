# M3 Completion — 2026-09-26

## Milestone

**M3 — Productionized Persistent Solo Slice**

## Status

**Complete / Accepted**

## Included CPs

```text
CP-28 ✅ Balance Measurement Baseline
CP-29 ✅ Production Contract Hardening
CP-30 ✅ Guest -> Linked Account Domain
CP-31 ✅ Google OIDC Integration
CP-32 ✅ Archive Export Contract
CP-33 ✅ appDataFolder Sync + Retry
CP-34 ✅ Persistence / Identity Concurrency
CP-35 ✅ Full M3 Acceptance
```

## Final acceptance baseline

```text
Web         16 PASS
game-core   65 PASS
Worker      59 PASS
----------------
Total      140 PASS
```

Additional acceptance:

- typecheck PASS
- Web production build PASS
- game-core build PASS
- Worker Wrangler dry-run PASS
- local D1 migrations current through 0005
- Google restore browser smoke PASS
- exploration start / claim / result flow PASS without reload
- Google Drive popup cancellation remains nonblocking
- Drive retry and archive sync PASS with zero failures
- gameplay remains usable after archive synchronization

## M3 release boundary

M3 establishes a production-oriented persistent solo baseline with:

- D1-authoritative gameplay state
- guest-first player creation
- Google-linked restore identity
- provider-independent identity domain rules
- encrypted Google Drive refresh-token persistence
- long-term appDataFolder archive export
- retry/idempotency semantics
- archive delivery concurrency lease
- stable API error contracts
- retained M2 gameplay/progression/equipment behavior

## Deferred work

M3 does not attempt to finish all production UX or future gameplay systems.

Deferred work begins from:

- `docs/wbs/POST_M3_WBS_HANDOFF_2026-09-26.md`
- `docs/wbs/POST_M3_GOOGLE_IDENTITY_DRIVE_PERSISTENCE_UX_PLAN_2026-09-26.md`

Notably, Google/Drive connection-state UX improvements are deliberately Post-M3 and do not reopen this milestone.

## Next state

Use this commit line as the M3 baseline for the next WBS/CP planning cycle.
