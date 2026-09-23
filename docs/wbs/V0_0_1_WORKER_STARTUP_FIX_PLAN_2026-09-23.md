# Wanderloom v0.0.1 Worker起動エラー修正計画

作成日: 2026-09-23
対象リポジトリ: `arnatoatadaink/wanderloom`
対象ブランチ: `feat/cp-19-m1-acceptance-loop`
起点コミット: `82ab0d181553422709b023edb1a883fd20ab5dcf`
関連レポート: [v0.0.1ブラウザ検収作業レポート](V0_0_1_BROWSER_ACCEPTANCE_REPORT_2026-09-23.md)

## 1. 目的

ブラウザ検収時に発生したWorker runtimeの起動エラーを最小範囲で修正し、ローカルWorker、local D1、Vite Web、実ブラウザの検収を再開可能にする。

今回の修正対象はWorker entrypointの公開形式に限定する。ゲームルール、D1スキーマ、APIレスポンス、Web UI仕様は変更しない。

## 2. 現在のブロッカー

`pnpm --filter @wanderloom/api dev` 実行時に、次のエラーでWorkerが起動しない。

```text
Incorrect type for map entry 'API_WORKSPACE_READY':
the provided value is not of type 'function or ExportedHandler'.
```

現在の [`workers/api/src/index.ts`](../../workers/api/src/index.ts) には、default Worker handlerに加えて、テスト用のboolean名前付きエクスポートが存在する。

```ts
export const API_WORKSPACE_READY = true;
```

Wranglerがこの名前付きエクスポートをWorker公開エントリとして解釈し、`boolean` がWorker handlerとして不正なためruntime初期化に失敗していると推定する。

## 3. 修正方針

### 推奨方針: Worker entrypointからテスト用boolean exportを除去する

1. `workers/api/src/index.ts` の `API_WORKSPACE_READY` 名前付きエクスポートを削除する。
2. `workers/api/src/index.test.ts` から `API_WORKSPACE_READY` のimportとboolean assertionを削除する。
3. Worker moduleの読み込み確認は、既存の `worker.fetch()` による `/api/health` 応答検証で行う。
4. default exportの `fetch` handlerは変更しない。

この方針では、Worker entrypointがdefault `ExportedHandler`だけを公開するため、Wranglerの公開エントリ契約とテストの責務が一致する。

### 採用しない方針

- boolean値を別の型へ変更してWorker entrypointに残す
- Wranglerや依存パッケージを更新して回避する
- WorkerのAPI実装やD1処理を変更する
- 起動エラーを無視してWeb側だけを検収する

## 4. 作業手順

### Step 1: 変更前確認

- 作業ツリーの変更を確認する。
- `main`、remote、タグには触れない。
- 関連ファイルの現状を確認する。

対象:

- `workers/api/src/index.ts`
- `workers/api/src/index.test.ts`
- `workers/api/wrangler.jsonc`

### Step 2: Worker entrypointの最小修正

- `API_WORKSPACE_READY` の公開を削除する。
- `index.test.ts` のテストをdefault handlerのhealth route検証に整理する。
- テストの目的を「boolean sentinelの存在」ではなく「Cloudflare Vitest runtime内でWorker handlerが読み込め、health routeが応答すること」にする。

### Step 3: 静的再検証

rootから次を実行する。

```bash
pnpm typecheck
pnpm test
pnpm build
git diff --check
git status --short
```

合格条件:

- typecheck成功
- game-core、Web、APIの全テスト成功
- game-core build成功
- Web build成功
- Worker dry-run build成功
- `git diff --check` に出力なし
- lockfile、migration、無関係なtracked fileに変更なし

### Step 4: local D1確認

`workers/api/wrangler.jsonc` の設定値を再確認し、推測でDB名を指定しない。

```bash
pnpm --filter @wanderloom/api exec wrangler d1 migrations apply wanderloom-local --local
```

確認項目:

- `DB` bindingが利用可能
- `wanderloom-local` にmigrationが適用される
- `0001_initial.sql` の適用失敗がない

### Step 5: Worker起動確認

```bash
pnpm --filter @wanderloom/api dev
```

起動後、別Terminalから次を実行する。

```bash
curl -i http://127.0.0.1:8787/api/health
```

合格条件:

```text
HTTP 200
{"ok":true}
```

Worker起動またはhealth routeが失敗した場合は、Web検収へ進まず停止して原因を記録する。

### Step 6: Web起動・API接続確認

Workerが正常起動した後、別Terminalで次を実行する。

```bash
pnpm --filter @wanderloom/web dev
```

Viteが表示した実際のURLをブラウザで開く。通常想定は `http://127.0.0.1:5173` だが、表示されたURLを優先する。

確認項目:

- ページが表示される
- `/api` が `127.0.0.1:8787` へproxyされる
- Guest bootstrapが成功する
- 初期state、zones、inventoryが取得される
- Consoleにuncaught exceptionがない
- NetworkにAPIの4xx/5xx、CORS、endpoint mismatchがない

### Step 7: ブラウザ検収再開

修正計画の対象外であるゲーム実装を変更せず、検収レポートの未実施項目を再開する。

1. 初期表示 / Guest bootstrap
2. 探索対象・duration選択
3. 探索開始
4. server-authoritative `endsAt` の確認
5. 完了後claim
6. Gold / EXP / real drop表示
7. inventory表示
8. charm equipment
9. reload後のstate維持
10. duplicate claim拒否
11. 2回目の探索開始
12. Console / Networkの最終確認

## 5. 検証マトリクス

| 段階 | 成功条件 | 失敗時の扱い |
| --- | --- | --- |
| Entry point | Wranglerがruntime初期化を完了 | Worker起動検収で停止 |
| Health | `/api/health` が200 `{ok:true}` | Web起動へ進まない |
| D1 | local migrationが適用済み | DB設定・migrationを調査 |
| Web boot | 初期画面とbootstrapが成功 | Browser検収で停止 |
| Playable loop | start→completion→claim→reward | main統合不可 |
| Persistence | reload後にstate/inventory/equipmentが維持 | FAILとして記録 |
| Safety | duplicate claim/raceで二重加算なし | FAILとして記録 |
| Repository | 意図しない差分なし | 修正範囲を見直す |

## 6. 完了条件

以下をすべて満たした場合に、Worker起動修正とブラウザ検収再開を完了とする。

- Workerが `127.0.0.1:8787` で起動
- `/api/health` が成功
- local D1 migrationが成功
- 静的検収が再度成功
- Vite Webが起動
- WebからWorker APIへ接続
- playable loopがブラウザ上で完了
- reload後の永続化を確認
- duplicate claimが拒否される
- Console / Networkに重大エラーがない
- 意図しない差分がない

## 7. 作業範囲外・禁止事項

この計画では以下を行わない。

- `main` へのmergeまたはpush
- force push、reset、history rewrite
- `v0.0.1` tagの作成
- production Worker/D1への変更
- API仕様、ゲームルール、D1 migrationの変更
- lockfileの無断更新
- テスト削除による合格化

## 8. 次の成果物

- Worker entrypoint修正の差分
- 静的再検証結果
- Worker / D1 / Web起動結果
- ブラウザ検収更新版レポート

修正とブラウザ再検収が完了するまで、`main`統合および`v0.0.1`タグ作成は保留する。
