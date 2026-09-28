# Wanderloom M5 / CP-49 ローカル検収レポート

- 対象: CP-49
- 目的: 全体回帰、M5受入れ判定、必要に応じて `m5` → `main` 統合、`v0.0.5` 固定
- 実施環境: ローカル / WSL
- 判定単位: CLI回帰 + GUI回帰 + 永続化確認 + リポジトリ状態
- 想定ブランチ: `m5`
- 最終タグ候補: `v0.0.5`
- 検収したソースSHA: `d30cd8fbae76776fd05bcdeb56ac13e8e344411f`
- ローカル／ソース検収: **PASS**（2026-09-28）
- リリース統合・タグ固定・実リモート操作: **未実施**

実測結果とリモート契約の確認内容は「18. 実施証跡」に記録する。

---

## 1. 検収方針

CP-49では、個別CPで実施済みの単体確認を再実施すること自体よりも、
M5全体を結合した状態で回帰がないことを確認する。

検収は以下の4層で行う。

1. CLI全体回帰
2. Web GUI回帰
3. 永続化・二重処理防止確認
4. Git / リリース状態確認

すべてPASSした場合にM5をAcceptedとし、`m5` → `main` 統合と
`v0.0.5` タグ固定へ進む。

---

# 2. 事前確認

## 2.1 作業ツリー

```bash
git status --short
git branch --show-current
git log -1 --oneline
```

### 判定

- [ ] 現在の作業ブランチがM5対象ブランチである
- [ ] 意図しない未コミット差分がない
- [ ] HEADが検収対象コミットである

記録:

- Branch: `m5`
- HEAD: 検収したソース `d30cd8fbae76776fd05bcdeb56ac13e8e344411f`
- Working tree: 検収開始時はclean。最終レポートcommit後に再確認する。
- 判定: PASS

---

# 3. CLI 全体回帰

## 3.1 TypeScript typecheck

```bash
pnpm -r typecheck
```

### 判定

- [ ] `packages/game-core` PASS
- [ ] `apps/web` PASS
- [ ] `workers/api` PASS
- [ ] TypeScript error 0件

結果:

```text

```

判定: PASS / FAIL

---

## 3.2 全テスト

```bash
pnpm -r test
```

確認する値:

- Test Files:
- Tests:
- Failed:
- Skipped:
- Duration:

### 判定

- [ ] 全workspaceでテスト成功
- [ ] fail = 0
- [ ] 意図しないskip増加なし

結果:

```text

```

判定: PASS / FAIL

---

## 3.3 Worker / Build 回帰

プロジェクトで現在採用しているM5検収コマンドを実行する。

例:

```bash
pnpm --filter @wanderloom/api exec wrangler deploy --dry-run
```

必要に応じてWeb buildも実行:

```bash
pnpm --filter @wanderloom/web build
```

### 判定

- [ ] Wrangler dry-run成功
- [ ] Web build成功（対象の場合）
- [ ] unresolved importなし
- [ ] binding / config errorなし

結果:

```text

```

判定: PASS / FAIL

---

## 3.4 Diff整合性

```bash
git diff --check
git status --short
```

### 判定

- [ ] `git diff --check` 出力なし
- [ ] 検収操作による意図しないtracked file変更なし

判定: PASS / FAIL

---

# 4. GUI 起動確認

ローカル環境でWebとAPIを通常の開発手順で起動する。

起動例は現行package scriptsを優先する。

```bash
pnpm dev
```

または各workspaceを個別起動する場合は、現在のREADME / package.json記載の
コマンドを使用する。

## 4.1 初期表示

確認項目:

- [ ] Webページが正常にロードされる
- [ ] blank screenにならない
- [ ] mobile shell / main layoutが崩れていない
- [ ] destination / zone等の主要情報が表示される
- [ ] ボタンやカードが画面外へ不自然にはみ出さない
- [ ] Consoleに重大なJavaScript errorがない
- [ ] Networkに想定外のHTTP 4xx / 5xxがない

結果メモ:

```text

```

判定: PASS / FAIL

---

# 5. Exploration 回帰

## 5.1 探索条件選択

- [ ] destination / zoneを選択・確認できる
- [ ] duration selectorを操作できる
- [ ] 探索時間または行動コストが表示される
- [ ] reward / risk等、M5で表示対象となっている情報が崩れていない
- [ ] Start Explorationが操作可能になる

結果メモ:

```text

```

判定: PASS / FAIL

---

## 5.2 Start Exploration

探索を1回開始する。

- [ ] ボタン押下が1回の操作として処理される
- [ ] API errorなし
- [ ] exploration stateへ遷移する
- [ ] 開始時刻 / 残り時間 / 状態表示が矛盾しない
- [ ] 二重開始など不正な状態にならない

DevTools確認:

- [ ] Console重大errorなし
- [ ] 対象APIで想定外4xx / 5xxなし

結果メモ:

```text

```

判定: PASS / FAIL

---

# 6. Exploration 完了 / Result / Claim

探索が完了した状態まで進める。

開発用短時間探索、既存fixture、時刻操作など、
現在の実装で安全に利用できる方法がある場合はそれを使用してよい。

## 6.1 Result

- [ ] completed状態へ遷移する
- [ ] result screenが表示される
- [ ] 報酬内容が表示される
- [ ] rarity等の表示が仕様と矛盾しない
- [ ] 表示崩れなし

判定: PASS / FAIL

---

## 6.2 Claim

Claimを1回実施する。

- [ ] Claim成功
- [ ] 成功状態がGUIへ反映される
- [ ] progression / rewardの値が更新される
- [ ] 獲得itemがinventoryへ反映される
- [ ] APIで想定外errorなし

### 二重Claim防止

Claim済みの状態でもう一度操作を試みる、またはUI状態を確認する。

- [ ] Claimボタンが無効化・非表示など適切な状態になる
- [ ] 二重Claimが成立しない
- [ ] reload後も再Claimできない

結果メモ:

```text

```

判定: PASS / FAIL

---

# 7. Progression / Inventory / Equipment

## 7.1 Progression

M5で追加・変更された進行表示を確認する。

- [ ] XP / level / progression等が正しく更新される
- [ ] Claim前後の差分が自然である
- [ ] NaN / undefined / 負値など異常値が出ない
- [ ] reload後も保持される

判定: PASS / FAIL

---

## 7.2 Inventory

- [ ] 獲得アイテムがinventoryに表示される
- [ ] rarity / name / quantity等が正常表示される
- [ ] 重複・欠落がない
- [ ] reload後も保持される

判定: PASS / FAIL

---

## 7.3 Equipment

装備機能がM5対象に含まれる場合に実施する。

- [ ] アイテムを装備できる
- [ ] equipment slotへ反映される
- [ ] 装備変更が表示へ即時反映される
- [ ] reload後も装備状態が保持される

対象外の場合:

- [ ] N/A と記録した

判定: PASS / FAIL / N/A

---

# 8. Persistence / Reload 回帰

次の状態でブラウザをreloadする。

1. exploration開始後
2. Claim後
3. inventory / equipment更新後

確認:

- [ ] exploration stateが失われない
- [ ] Claim済み状態が失われない
- [ ] inventoryが維持される
- [ ] progressionが維持される
- [ ] equipmentが維持される（対象の場合）
- [ ] reloadによる重複報酬が発生しない
- [ ] reloadによる二重Claimが発生しない

結果メモ:

```text

```

判定: PASS / FAIL

---

# 9. Google / Archive / Sync 表示確認

M5でGoogle連携・Archive・履歴同期関連が含まれている場合に実施する。

最低限の回帰確認:

- [ ] ゲスト状態でも画面が破綻しない
- [ ] Google連携導線が表示される場合、表示が正常
- [ ] Archive / History表示が正常
- [ ] `sync_status` 相当の表示が存在する場合、異常値がない
- [ ] `claimed_at` 相当の状態がUIと矛盾しない
- [ ] `attempt_count` 等が表示対象の場合、正常に扱われる
- [ ] Console重大errorなし

Google OAuth / Driveの実接続がM5受入れ基準に明記されている場合のみ、
実アカウント接続試験を追加する。

実接続試験:

- [ ] 必須
- [ ] 不要
- [ ] 未確認

結果メモ:

```text

```

判定: PASS / FAIL / N/A

---

# 10. Responsive / Mobile 確認

Wanderloomはmobile-firstを前提としているため、最低1つの狭幅viewportで確認する。

推奨:

- Chrome DevTools mobile viewport
- 幅 360～430px程度

確認:

- [ ] horizontal overflowなし
- [ ] 主要CTAが押せる
- [ ] modal / card / navigationが画面外へ欠けない
- [ ] text overlapなし
- [ ] result / inventory画面も操作可能

可能ならdesktop幅でも1回確認:

- [ ] desktop幅で致命的な崩れなし

判定: PASS / FAIL

---

# 11. DevTools 最終確認

GUI一周後に確認する。

## Console

- [ ] uncaught exceptionなし
- [ ] React / runtime重大errorなし
- [ ] repeated infinite-loop系warningなし

## Network

- [ ] 想定外HTTP 4xxなし
- [ ] 想定外HTTP 5xxなし
- [ ] API requestの無限再送なし
- [ ] Claim等のmutationが意図せず複数回送信されていない

結果メモ:

```text

```

判定: PASS / FAIL

---

# 12. M5 受入れ判定

## 必須条件

| 項目 | 判定 |
|---|---|
| Typecheck | PASS（3 workspace） |
| 全テスト | PASS（64 files / 212 tests） |
| Worker dry-run / build | PASS（local、staging、production、staging bootstrap、Web build） |
| `git diff --check` | PASS |
| GUI初期表示 | PASS（実API） |
| Exploration start | PASS（実API） |
| Exploration result | PASS（実APIの完了表示、fixtureの結果画面） |
| Claim | PASS（実API／D1に報酬確定） |
| 二重Claim防止 | PASS（再送409 `already_claimed`） |
| Progression | PASS（5 G / 10 XP、reload後も保持） |
| Inventory | PASS（獲得Charm、reload後も保持） |
| Equipment | PASS（装備・reload後の保持） |
| Persistence | PASS（探索中・Claim後・装備後のreload） |
| Google / Archive回帰 | PASS（fixture 6件、ゲスト表示。実OAuth/Drive接続は対象外） |
| Mobile表示 | PASS（390×844、横はみ出しなし） |
| Console / Network | PASS（予期しないpage error/API 4xx/5xxなし。GIS初期化警告は記録） |

## 最終判定

- [x] M5 Accepted（ローカル／ソース契約）
- [ ] Conditional Accepted
- [ ] Rejected

### Conditional / Rejected の場合の残課題

```text

```

---

# 13. M5 Accepted 後の統合手順

以下はM5がAcceptedになった場合のみ実施する。

## 13.1 最新状態確認

```bash
git status
git branch --show-current
git log --oneline --decorate -10
```

- [ ] working tree clean
- [ ] `m5` HEADを記録した

M5 HEAD:

```text

```

---

## 13.2 main更新

リモートの状態を取得する。

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

確認:

```bash
git status
git log -1 --oneline
```

---

## 13.3 m5 → main 統合

履歴がfast-forward可能な場合はfast-forwardを優先する。

```bash
git merge --ff-only m5
```

fast-forward不可の場合は、その理由を確認してから統合方式を判断する。
無条件にmerge commitを作成しない。

確認:

```bash
git status
git log --oneline --decorate -10
```

- [ ] 統合成功
- [ ] working tree clean

---

# 14. main 上で最終回帰

タグを打つ前にmain上で最低限もう一度実施する。

```bash
pnpm -r typecheck
pnpm -r test
git diff --check
```

必要なら:

```bash
pnpm --filter @wanderloom/api exec wrangler deploy --dry-run
pnpm --filter @wanderloom/web build
```

### 判定

- [ ] typecheck PASS
- [ ] test PASS
- [ ] diff check PASS
- [ ] dry-run / build PASS

main HEAD:

```text

```

---

# 15. v0.0.5 固定

main上の最終回帰PASS後にタグ作成。

推奨: annotated tag

```bash
git tag -a v0.0.5 -m "Wanderloom M5 v0.0.5"
```

確認:

```bash
git show --no-patch --decorate v0.0.5
```

タグが正しいmain HEADを指していることを確認する。

- [ ] tag = `v0.0.5`
- [ ] target commit = main HEAD
- [ ] M5 Accepted後のコミットを指している

---

# 16. Push

問題がなければ:

```bash
git push origin main
git push origin v0.0.5
```

必要ならブランチも同期:

```bash
git push origin m5
```

確認:

```bash
git status
git log -1 --oneline --decorate
git tag --points-at HEAD
```

### 最終確認

- [ ] `origin/main` 更新済み
- [ ] `v0.0.5` push済み
- [ ] tagがmain HEADを指す
- [ ] working tree clean

---

# 17. CP-49 完了記録

## CLI

- Typecheck: PASS（3 workspace）
- Test Files: 64 PASS
- Tests: 212 PASS
- Build / Wrangler: local build、staging/production/bootstrap dry-run PASS
- Diff check: PASS

## GUI

- Initial display: PASS（実API）
- Exploration: PASS（実API、探索中reload）
- Result: PASS（実APIの完了表示、fixture結果画面）
- Claim: PASS（実API／D1）
- Double-claim prevention: PASS（409 `already_claimed`）
- Progression: PASS（5 G / 10 XP）
- Inventory: PASS（Charm 1個）
- Equipment: PASS（装備とreload後の保持）
- Persistence: PASS（探索・Claim・装備）
- Google / Archive: fixture回帰PASS、実OAuth/Driveは対象外
- Mobile: PASS（390×844）
- Console: 予期しないpage error 0件。Google GISの重複初期化警告あり（実OAuth接続は未検証）
- Network: 予期しないAPI 4xx/5xx 0件

## Git

- M5 source HEAD: `d30cd8fbae76776fd05bcdeb56ac13e8e344411f`
- Main HEAD: `45c8d5b82cb93c2431d7946bfb5fa9a61264719d`（未統合）
- Tag: `v0.0.5` 未作成
- Push: 未実施

## CP-49 最終判定

```text
CP-49: PASS（ローカル／ソース検収）
M5: Accepted（ソース契約）
v0.0.5: Not Fixed
```

## 備考

```text
実リモート操作とリリース統合は未実施。詳細は第18節。
```

---

# 18. 実施証跡 — 2026-09-28

## 検収対象とCLI

- ソースSHA: `d30cd8fbae76776fd05bcdeb56ac13e8e344411f`（リモート設定パス修正を含む）
- `pnpm -r typecheck`: 3 workspace PASS。
- `pnpm -r test --configLoader runner`: 64 files / 212 tests PASS（game-core 19/65、Web 14/48、API 31/99）。`runner` は、このWSL環境でシンボリックリンク先の `node_modules/.vite-temp` が読み取り専用だったため使用した。
- `pnpm -r build`: game-core、Web production build、API local Wrangler dry-run PASS。Web bundleに unresolved import なし。
- 生成済みremote config: staging/productionのWorker名・D1名は別、D1 IDはUUID形式かつ別、両環境に要求するWorker secret名3件を確認。IDやsecret値は記録しない。生成設定はGit管理対象外。
- remote configを使った `wrangler deploy --dry-run`: staging、production、staging bootstrapの3対象すべてPASS。実デプロイなし。
- 同じremote configによる `wrangler d1 migrations list wanderloom-staging --local --env staging`: 0001～0006を検出。`--remote`、`apply` は実行していない。既存のローカルDBへの `migrations apply DB --local` は「No migrations to apply」。
- `git diff --check`: PASS。追跡対象の `.dev.vars`、`.env.local`、生成 `.wrangler` 設定なし。

## GUI・永続化

- Playwright Chromium既存6件 PASS。Drive同期失敗／再試行、再認可、popup中断、Claim確定、装備、reloadをAPI fixture境界で確認。
- 別途、実ローカルWorker/D1とWebを接続し、390×844のChromiumでゲストbootstrap、2 zone・2 duration表示、探索開始、探索中reload、5分後のClaimを実行。Claim後のローカルD1には `success` と5 Gold・10 EXP・Charm 1個が確定していた。
- 同じClaimの再送は HTTP 409 `already_claimed`。Claim後の画面再読み込みで報酬値とCharmを保持し、Claimボタンは再表示されなかった。Charm装備後の再読み込みでも `Equipped` を保持。
- 390×844と1280×800で主要CTAとInventoryを確認し、横はみ出しなし。画面のpage errorと予期しないAPI 4xx/5xxは0件。ViteログにはGoogle GISの重複初期化警告が出た。Googleアカウント／Drive実接続は行っていないため、この警告の実接続への影響は未判定。
- 一時的な検収スクリプトはClaim後の見出しを大文字の `Success` と仮定して待機し、タイムアウトした。実データの結果値は小文字の `success`。D1確定、reload後のUI、Playwright既存fixtureの結果画面でClaim成功を確認した。

## CP-43～48の結合契約

- CP-43/45: environment別のWorker/D1分離、secret名3件、公開Web変数の区別、生成remote configとbootstrap configを確認。実remote dry-runで当初 `src/index.ts` の相対パス不整合を検出した。generatorとTypeScriptの構成モデルで、生成ファイル位置からの `main`・schema・`migrations_dir` パスを修正し、dry-runとローカル移行一覧で再検証した。
- CP-44: migrationコマンドは明示的なtarget、`--remote`、target固有の確認文を要求する。対象未指定・確認文不一致は単体テストで拒否を確認。実remote migrationのpreview/applyは行っていない。
- CP-46: stagingを先に確認し、SHA・tag・migration状態・smoke結果を記録する手順、Worker rollback、D1 schemaがrollbackされない制限をrunbookとテストで確認。
- CP-47: health、guest bootstrap、state、inventory、zones、exploration start/claim、migration stateのrelease-blocking判定をコードとテストで確認。実デプロイ後のsmokeは未実施。
- CP-48: event分類、request ID、機密キーの除外規則、ログのテストを確認。実運用ログの採取は未実施。

## 判定と運用境界

**CP-49ローカル／ソース検収: PASS。M5ソース契約: Accepted。**

この判定は実リモート資源の準備、staging/production D1移行、Worker/Webデプロイ、rollback、デプロイ後smokeの成功を主張しない。`m5` → `main` 統合、`v0.0.5` tag、pushも別途実施するリリース操作であり、この記録時点では未実施。
