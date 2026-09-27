# M4 Local Browser Acceptance — 2026-09-27

## Status

**Local automated acceptance PASS / Local migration PASS / Normal-path browser checks PASS / Failure-path browser checks not yet verified**

User-reported local verification. Repository baseline at receipt: `m4`,
`379893fd74f5f2de331f58ff73c595814fcd85ed`.
This is not verification of the resulting main integration commit.

## Browser evidence

| Check | Result | Reported observation |
| --- | --- | --- |
| Existing player resume | PASS | Same player, progression, inventory and exploration state restored. |
| Connected Drive authorization reuse | PASS | Connected displayed; Sync archive did not open a consent popup. |
| Exploration reward claim | PASS | Result and inventory committed without waiting for Drive sync completion. |
| Drive failure remains nonblocking | NOT VERIFIED | Failure scenario not exercised. |
| Transient network failure remains retryable | NOT VERIFIED | Failure scenario not exercised. |
| Reauthorization-required state and action | NOT VERIFIED | Failure scenario not exercised. |
| Authorization popup cancellation | NOT VERIFIED | Cancellation scenario not exercised. |
| F5 reload continuity | PASS | Same player and Drive state restored. |
| Cookie deletion followed by F5 | PASS | Same player and Drive state restored in the tested browser. |
| Local server restart continuity | PASS | Same player and Drive state restored. |

Cookie deletion evidence does not establish recovery after localStorage or all
site data is cleared; that scenario was not reported as tested.

## Automated evidence and integration boundary

CP-42 records 57 test files / 189 tests, typecheck, build and Wrangler dry-run
as PASS. See `CP-42_FULL_M4_ACCEPTANCE_2026-09-27.md`.
The user subsequently supplied a fresh local execution log on 2026-09-27
(test start times 14:52:55 and 14:52:59). The log confirms:

| Automated check | Result |
| --- | --- |
| Migration file set 0001–0006 | PASS |
| Workspace typecheck (web, game-core, api) | PASS |
| game-core tests | PASS — 19 files / 65 tests |
| web tests | PASS — 14 files / 48 tests |
| api tests | PASS — 24 files / 76 tests |
| Aggregate tests | PASS — 57 files / 189 tests |
| Web production build | PASS |
| game-core TypeScript build | PASS |
| Worker Wrangler 4.132.0 deploy dry-run | PASS |
| CP-42 full automated acceptance | PASS |

After the runner passed, the user applied the pending local D1 migration via:

```bash
pnpm --filter @wanderloom/api exec wrangler d1 migrations apply wanderloom-local --local
```

Wrangler reported `0006_google_drive_reauthorization_state.sql` successfully
applied (3 commands executed successfully) to local `wanderloom-local`, using
`.wrangler/state/v3/d1`. This is local migration evidence, not remote deployment.
The supplied execution log does not include a commit SHA; the repository still
points to the m4 baseline recorded above at receipt.

Automated coverage is separate from the four unverified browser scenarios above.

Before final release acceptance, verify the resulting main commit using
`V0_0_4_MAIN_LOCAL_ACCEPTANCE_CHECKLIST_2026-09-27.md` and record remaining
browser scenarios as PASS, FAIL or explicitly unverified. This record does not
declare full browser acceptance or readiness to tag v0.0.4.

## Future design feedback: automatic Drive synchronization

The user requests that automatic synchronization be included in future design.
M4 already implements best-effort synchronization after successful reward claim
(CP-41); this feedback concerns extending the normal flow so that archive
continuity does not depend on pressing Sync archive.

Follow-up design should define synchronization triggers (including resume with
pending archive), retry policy, and visible sync status. These are design topics,
not newly accepted implementation requirements for this release.
Preserve nonblocking gameplay, reuse valid stored authorization, and keep OAuth
consent an explicit user action when connection or reauthorization is required.
Manual retry/reconnect remains a recovery path.
