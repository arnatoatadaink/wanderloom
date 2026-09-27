# M4 Local Browser Acceptance — 2026-09-27

## Status

**Local automated acceptance PASS / Local migration PASS / Normal-path browser checks PASS / API-mocked Chromium failure-path checks PASS / Live Google failure paths not yet verified**

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

## Local main integration validation

On 2026-09-27, local main integrated m4 without conflicts:

- Main parent: `c698e440dd1f1be2063fe545e1f22af188c672ca`
- M4 parent: `b04eaf79415f50736b78c0b43f148e9af948e704`
- Tested local merge: `bb16a0c87c13e140d7e245ee037f192f7d27a721`
- `bash scripts/cp42-acceptance.sh`: PASS (exit 0)
- Migration set 0001–0006 and all workspace typechecks: PASS
- Tests: 57 files / 189 tests PASS (game-core 65, web 48, api 76)
- All workspace builds and Wrangler deploy dry-run: PASS
- Runtime: Node 22.20.0, matching `.nvmrc`

The first sandboxed attempt failed because Vite could not write temporary files
through the node_modules symlink into the WSL dependency directory. The complete
runner passed after granting access to the existing dependency environment.
No application changes were needed.

Integration PR: https://github.com/arnatoatadaink/wanderloom/pull/31 (Draft).
Remote main has not been changed and v0.0.4 has not been tagged. Browser failure
paths remain unverified; the earlier browser observations concern the m4 baseline.

Before final release acceptance, verify the resulting main commit using
`V0_0_4_MAIN_LOCAL_ACCEPTANCE_CHECKLIST_2026-09-27.md` and record remaining
browser scenarios as PASS, FAIL or explicitly unverified. This record does not
declare full browser acceptance or readiness to tag v0.0.4.

## Automated Chromium failure-path evidence

On 2026-09-27, GPT-6 Sol implemented and ran Playwright 1.63.0 against the real
Web application in Chromium. All 6 browser tests passed:

- Pending and failed Drive sync: reward result remains visible, equipment can be
  changed while sync is pending, next exploration starts after failure, and
  claimed rewards survive reload through the stateful mocked API.
- Network abort, HTTP 429 and HTTP 503: explicit retry succeeds without OAuth
  consent or incorrectly presenting reconnect-required state (3 tests).
- Persisted reconnect-required status: reload and reward claim do not open OAuth;
  explicit reconnect completes and changes the display to Connected.
- Google SDK popup-closed callback: cancellation stays local, gameplay proceeds,
  and explicit reconnect retry succeeds.

These tests mock the Worker API and Google Identity Services SDK boundary. They
verify the actual browser UI and client behavior, not real Google popups, Google
credential revocation, or D1 persistence. The original manual results remain
unchanged above. Backend invalid_grant/transient-error classification is covered
separately by existing CP-39 tests. Live Google failure-path checks remain
unverified; this evidence does not create a release tag or authorize a release.

Reproduction and report instructions:
`M4_BROWSER_FAILURE_RUNBOOK_2026-09-27.md`.

## Final remote integration and tag

PR #31 merged into remote main at
`ba154ed6b7cab1caf1a7989a665c501003a3e060` on 2026-09-27.
That exact commit passed the full CP-42 runner (189 tests), browser typecheck,
and all 6 API-mocked Chromium tests (28.5s, exit 0).
Annotated tag `v0.0.4` points to that tested commit and was pushed to origin.
Earlier pending/integration statements in this record describe the evidence at
their respective stages; the fixed release state is recorded in
`V0_0_4_BASELINE_FIXED_2026-09-27.md`. Live Google failure-path checks remain
unverified and are retained as a validation limitation.

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
