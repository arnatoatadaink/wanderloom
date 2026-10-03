# ADR-037: Production Zone Browser Acceptance

Status: Proposed
Date: 2026-10-03

## Context

PRs #66-#69 cut the production Zone catalog into the live Worker endpoint and then wired Rank-aware availability into the Web application. Unit and integration tests cover the response contracts and selection rules, but the final acceptance condition spans DOM rendering, button disablement, claim refresh ordering, and the next expedition selection.

## Decision

Add a Playwright browser acceptance test that owns only the Web/API boundary and verifies the complete production Zone progression UI loop.

The fixture starts at Zone Rank 0 and returns all five production Zones. Only Wayfarer Meadow is unlocked. A Wayfarer expedition is immediately claimable. The successful claim advances the fixture to Zone Rank 1. The application must then perform the already-defined sequential refresh:

`claim -> GET /api/zones -> reconcile selection`

The browser acceptance test verifies:

1. Wayfarer is enabled at Rank 0.
2. Mossglass, Shattered Causeway, Ashwind Highlands, and Starfall Frontier are disabled.
3. Rank requirement labels and Locked text are visible.
4. Wayfarer can be started and claimed.
5. `/api/zones` is fetched again only after the claim completes.
6. Mossglass becomes enabled after the Rank 1 refresh.
7. Mossglass can be selected and used to start the next expedition.
8. No unexpected external request, unmocked API call, or page error occurs.

## Scope

This browser fixture does not replace Worker integration tests, D1 tests, or manual visual review. It specifically locks the Web behavior introduced by the production Zone cutover.

## Acceptance commands

```bash
pnpm --filter @wanderloom/web typecheck:browser
pnpm --filter @wanderloom/web test:browser
pnpm --filter @wanderloom/web typecheck
pnpm --filter @wanderloom/web test
pnpm -r typecheck
pnpm -r test
git diff --check origin/main...HEAD
```

## Follow-up

After this browser acceptance is locally green and merged, perform a short manual visual review against main. If the visual review is clean, record the production Zone cutover acceptance evidence and close this cutover workstream before choosing the next product milestone.
