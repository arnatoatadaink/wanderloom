# v0.0.4 Main Local Acceptance Checklist — 2026-09-27

## Status

**Prepared for local main verification**

## Purpose

This checklist is the local verification guide for promoting the completed M4 `m4` branch to `main` and fixing the `v0.0.4` release baseline.

M4 implementation and CP-42 acceptance are already complete on `m4`. The purpose of this document is therefore not to rediscover feature correctness from scratch, but to confirm that the resulting `main` commit preserves the accepted M4 baseline without merge, environment, migration, build, or browser-level regressions.

Reference release baseline:

- `docs/wbs/V0_0_4_RELEASE_BASELINE_2026-09-27.md`
- M4 milestone: **Seamless Persistence UX**
- CP-36 through CP-42: **Complete / Accepted**
- CP-42 aggregate acceptance: **57 test files / 189 tests PASS**
- M4 integration branch: `m4`

## 1. Pre-merge repository integrity

Before merging `m4` into `main`, confirm the local worktree is clean and both refs are current.

```bash
git status --short
git fetch origin --prune
git switch main
git pull --ff-only
git log -1 --oneline main
git log -1 --oneline origin/m4
```

Acceptance:

- no unintended tracked or staged changes,
- `main` matches the expected remote main head,
- `origin/m4` contains the accepted M4 baseline,
- no accidental local merge/rebase residue exists.

Useful comparison:

```bash
git log --oneline --decorate --graph --max-count=30 --all
git diff --stat main..origin/m4
git diff --name-status main..origin/m4
```

Review the delta for unexpected deletions, generated files, secrets, `.dev.vars`, `.wrangler/`, local databases, or build output.

## 2. Main integration check

After the release merge is performed, switch to the resulting `main` and record the exact commit.

```bash
git switch main
git pull --ff-only
git rev-parse HEAD
git log -1 --show-signature --decorate
```

Record:

```text
main release commit: <commit>
release PR / merge reference: <PR or merge commit>
```

Acceptance:

- current branch is `main`,
- the expected M4 merge is present,
- no commits are missing between the accepted `m4` state and `main`,
- release documentation and CP-42 runner are present.

Check key files:

```bash
test -f scripts/cp42-acceptance.sh
test -f docs/wbs/CP-42_FULL_M4_ACCEPTANCE_2026-09-27.md
test -f docs/wbs/V0_0_4_RELEASE_BASELINE_2026-09-27.md
test -f workers/api/migrations/0006_google_drive_reauthorization_state.sql
```

## 3. Automated main acceptance

Run the same accepted CP-42 gate on the resulting main commit.

```bash
bash scripts/cp42-acceptance.sh
```

Expected baseline:

- migrations `0001` through `0006`: PASS,
- all workspace typechecks: PASS,
- packages/game-core: 19 test files / 65 tests PASS,
- apps/web: 14 test files / 48 tests PASS,
- workers/api: 24 test files / 76 tests PASS,
- aggregate: 57 test files / 189 tests PASS,
- all workspace builds: PASS,
- Wrangler deploy dry-run: PASS.

A change in test count is not automatically a failure if additional intentional tests were added during release integration, but any reduction or skipped/failed test must be explained before tagging.

## 4. D1 migration verification

Confirm the migration set is intact and ordered.

```bash
ls -1 workers/api/migrations
```

Expected:

```text
0001_initial.sql
0002_external_identity_links.sql
0003_archive_export_state.sql
0004_google_drive_authorizations.sql
0005_archive_export_delivery_lease.sql
0006_google_drive_reauthorization_state.sql
```

If validating against a disposable/local D1 database, apply migrations using the established local Wrangler procedure and verify that `0006` installs without requiring manual schema edits.

Acceptance:

- no migration was renumbered or removed,
- `0006` applies after `0005`,
- existing authorization rows remain compatible through default values,
- successful authorization can clear a persisted reconnect-required marker.

Do not run destructive migration experiments against data that has not been backed up.

## 5. Browser smoke acceptance

Use the normal local web + Worker environment. This is a targeted smoke pass; CP-42 already covers the automated contract suite.

### 5.1 Existing stored player

Confirm a previously known player can load without creating a replacement guest.

Acceptance:

- player state loads,
- progression/inventory remain available,
- current exploration state is restored correctly,
- no global error appears merely because Drive is unavailable.

### 5.2 Drive connected state

For a linked player with valid stored Drive authorization:

- Drive status displays `Connected`,
- manual action is `Sync archive`,
- manual sync does not open a new OAuth consent popup,
- gameplay controls remain usable independently of Drive busy state.

### 5.3 Temporary provider failure

When a transient Drive/OAuth provider failure is simulated or encountered:

- UI presents a temporary/retryable state,
- retry does not force a new consent popup,
- gameplay does not transition to the global error screen,
- authorization is not incorrectly persisted as reconnect-required.

### 5.4 Reauthorization required

For an actual persisted reconnect-required state:

- UI displays `Reconnect required`,
- action is `Reconnect Google Drive`,
- automatic background sync does not open OAuth,
- reconnect remains an explicit user action.

### 5.5 Popup cancellation

Cancel the Drive authorization popup.

Acceptance:

- cancellation remains local to Drive recovery,
- player remains on a playable screen,
- no gameplay state rollback occurs,
- retry/reconnect remains available.

## 6. Claim → best-effort archive sync

This is the most important M4 end-to-end behavior to recheck on `main`.

For a claimable expedition:

1. claim rewards,
2. confirm result/progression/inventory update immediately,
3. observe background archive behavior.

Acceptance:

- D1/gameplay claim is authoritative,
- result screen is not blocked waiting for Drive,
- connected Drive may run best-effort background sync,
- transient failure does not undo or hide rewards,
- disconnected/reconnect-required states do not open OAuth automatically,
- manual recovery remains available later.

If the browser is closed immediately after claim, archive continuity is best-effort; the claim itself must remain durable because Drive is not gameplay authority.

## 7. Returning-player continuity

Restart the browser/app with the stored player identity still present.

Acceptance:

- the same player resumes,
- no unnecessary Google restore prompt is introduced for the locally stored player,
- Drive connection state is reloaded from the server contract,
- valid authorization can be reused,
- reconnect-required state remains explicit and recoverable.

## 8. Low-bandwidth / request sanity

M4 should not add repeated consent or unnecessary preflight traffic to the normal claim loop.

Review browser network activity for one ordinary connected-player cycle:

```text
load → start → claim → result
```

Acceptance:

- no OAuth popup in the ordinary connected path,
- claim does not perform an extra Drive-status preflight solely to decide whether to sync,
- best-effort sync follows the cached/persisted state path,
- repeated retry loops are not generated automatically.

Exact request counts may vary with UI reloads and development tooling; evaluate behavior rather than requiring a brittle fixed count.

## 9. Build artifact sanity

After `pnpm build`, inspect status:

```bash
git status --short
```

Acceptance:

- generated output does not appear as unintended tracked changes,
- `.wrangler/`, local DBs, `.dev.vars`, tokens, and secrets remain untracked/uncommitted,
- no release procedure requires checking credentials into Git.

## 10. Release tag preconditions

Do not create `v0.0.4` until all of the following are true:

- local `main` points to the intended release commit,
- `bash scripts/cp42-acceptance.sh` is green on that exact commit,
- browser smoke checks have no release-blocking regression,
- migration 0001–0006 integrity is confirmed,
- worktree is clean,
- exact main release commit has been recorded.

Before tagging:

```bash
git status --short
git rev-parse HEAD
git tag -l 'v0.0.4'
```

Expected before creation:

- clean worktree,
- known main commit,
- no pre-existing conflicting `v0.0.4` tag.

## 11. Recommended local evidence record

Copy the following template into the release record after verification:

```text
Branch: main
Main commit: <sha>
Date: <local date/time>

CP-42 runner: PASS
Migrations 0001-0006: PASS
Typecheck: PASS
Tests: PASS
  game-core: <files/tests>
  web: <files/tests>
  api: <files/tests>
Build: PASS
Wrangler dry-run: PASS

Browser stored-player restore: PASS / N/A / FAIL
Drive connected reuse: PASS / N/A / FAIL
Transient failure remains nonblocking: PASS / N/A / FAIL
Reauthorization-required UX: PASS / N/A / FAIL
Popup cancellation nonblocking: PASS / N/A / FAIL
Claim -> result before/beside best-effort Drive sync: PASS / N/A / FAIL
Returning-player continuity: PASS / N/A / FAIL

Worktree clean: PASS
Release blocker: none / <details>
Decision: READY FOR v0.0.4 TAG / HOLD
```

## 12. Release blockers

Treat the following as blockers for `v0.0.4` tagging:

- any typecheck/test/build/CP-42 failure,
- migration failure or schema incompatibility,
- existing linked player cannot resume,
- Drive provider failure causes gameplay/global error or claim rollback,
- ordinary connected Drive path repeatedly asks for OAuth consent,
- `reauthorization_required` is incorrectly set by transient 429/5xx/network failure,
- claim waits on Drive before presenting the authoritative result,
- secrets or local runtime data appear in the release diff.

Non-blocking observations should be recorded separately for Post-M4 work rather than silently expanding M4 scope.

## Final decision rule

If the automated gate is green, the browser smoke matrix has no blocker, and the exact `main` commit is clean and known, mark local main acceptance **PASS** and proceed to the annotated `v0.0.4` tag/fixed-baseline step.
