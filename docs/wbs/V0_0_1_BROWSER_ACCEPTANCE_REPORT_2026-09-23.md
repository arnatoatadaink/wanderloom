# Wanderloom v0.0.1 統合前ブラウザ検収作業レポート

作成日: 2026-09-23
対象リポジトリ: `arnatoatadaink/wanderloom`
検収対象ブランチ: `feat/cp-19-m1-acceptance-loop`
検収対象コミット: `82ab0d181553422709b023edb1a883fd20ab5dcf`
統合予定先: `main`

## 1. 結論

**FAIL — Worker 起動前に停止。ブラウザ検収は未実施。**

`http://127.0.0.1:8787` はWorker APIの待受先であり、Web画面ではない。Worker起動を試行したが、Cloudflare Workers runtime の初期化時にエラーが発生したため、APIおよびWebの実ブラウザ検収へ進めなかった。

このレポート作成時点で、`main` の更新、force push、タグ作成、コード修正、本番リソース変更は行っていない。

## 2. 検収前状態

### Git

- `origin` を `fetch --prune` 済み
- ローカルの検収対象ブランチは `origin/feat/cp-19-m1-acceptance-loop` と一致
- `origin/main` に対して ahead 218 / behind 0
- 検収開始時の作業ツリーは clean

### Runtime

| 項目 | 実測値 |
| --- | --- |
| Node.js | v22.20.0 |
| pnpm | 10.17.1 |
| Wrangler | 4.132.0 |
| Worker name | `wanderloom-api` |
| D1 binding | `DB` |
| local database | `wanderloom-local` |
| Worker想定URL | `http://127.0.0.1:8787` |

`pnpm install --frozen-lockfile` は今回実行していない。既存の依存関係を使用した。

## 3. 実施済み検収

### 静的検収

| 項目 | 結果 | 備考 |
| --- | --- | --- |
| workspace typecheck | PASS | web / game-core / API 全て成功 |
| workspace test | PASS | game-core 22、web 7、API 21、合計50テスト |
| workspace build | PASS | game-core、Vite、Worker dry-run build |
| Web bundle計測 | PASS | raw 17,800 bytes、gzip 5,757 bytes |
| Worker dry-run | PASS | 33.28 KiB / gzip 6.18 KiB |
| `git diff --check` | PASS | 空白エラーなし |

### 設定確認

以下を確認した。

- `workers/api/wrangler.jsonc`
  - Worker name: `wanderloom-api`
  - D1 binding: `DB`
  - database name: `wanderloom-local`
  - migration directory: `migrations`
- `apps/web/vite.config.ts`
  - `/api` を `http://127.0.0.1:8787` へ proxy
- `apps/web/package.json`
  - Web開発サーバー: Vite
  - Web package: `@wanderloom/web`

## 4. Worker起動検収

### 実行コマンド

```bash
pnpm --filter @wanderloom/api dev
```

### 実測結果

WranglerはD1 bindingの認識までは成功したが、Worker runtime起動時に停止した。

```text
Uncaught TypeError: Incorrect type for map entry 'API_WORKSPACE_READY':
the provided value is not of type 'function or ExportedHandler'.
```

その後、以下への接続も失敗した。

```text
curl http://127.0.0.1:8787/api/health
curl: (7) Failed to connect to 127.0.0.1 port 8787
```

## 5. 失敗箇所と推定原因

### 失敗箇所

[`workers/api/src/index.ts`](../../workers/api/src/index.ts) に、Worker handler以外の名前付きエクスポートが存在する。

```ts
export const API_WORKSPACE_READY = true;

export default {
  fetch(request: Request, env: ApiEnv): Promise<Response> {
    return api.fetch(request, env);
  }
};
```

### 推定原因

WranglerがWorker entrypointの名前付きエクスポート `API_WORKSPACE_READY` をWorker handlerとして解釈し、`function` または `ExportedHandler` ではないboolean値のためruntime初期化に失敗していると推定する。

この値は [`workers/api/src/index.test.ts`](../../workers/api/src/index.test.ts) のworkspace読み込みテストから参照されている。

### 影響範囲

- Workerが起動しない
- `/api/health` を含む全APIが利用できない
- Viteの `/api` proxy先が存在しない
- Guest bootstrap、探索開始、claim、inventory、equipmentを実ブラウザから検証できない
- Phase 7以降のWeb起動、playable loop、reload、Console/Network検収を実施できない
- `v0.0.1` baselineとしての統合判定は不可

## 6. 未実施の検収

Worker起動失敗により、以下は未実施とした。

- Phase 5: Worker正常起動確認
- Phase 6: 実WorkerとWebのAPI接続確認
- Phase 7: Vite起動とブラウザ表示
- Phase 8: ブラウザ上のplayable loop
- Phase 9: reload / Worker再起動後の永続化
- Phase 10: ブラウザからのduplicate claim
- Phase 12: Browser console / Network確認

なお、実D1を使用したCP-19/CP-18 integration testは静的検収として成功しているが、これは実ブラウザ検収の代替ではない。

## 7. 修正候補

検収中のため自動修正は行っていない。別作業として、以下を検討する。

1. Worker entrypointからbooleanの名前付きエクスポートを除去する。
2. workspace読み込みテストの準備完了判定を、Worker entrypoint以外のテスト専用モジュールへ移す。
3. 修正後に `pnpm typecheck`、`pnpm test`、`pnpm build` を再実行する。
4. Wrangler Workerを再起動し、`GET /api/health` が `{ "ok": true }` を返すことを確認する。
5. Viteを起動し、実ブラウザ検収をPhase 6以降から再開する。

## 8. 判定

```text
Result: FAIL
Blocking issues:
  Worker runtime fails before listening on 127.0.0.1:8787 because
  API_WORKSPACE_READY is exported as a boolean from the Worker entrypoint.

Browser validation:
  NOT STARTED

Main integration:
  NOT AUTHORIZED / NOT EXECUTED

Tag v0.0.1:
  NOT CREATED
```

## 9. 次の作業

このレポートを根拠として、Worker entrypointの起動エラーを修正する作業計画を別途作成する。修正・再検証が完了するまで、`main` 統合および `v0.0.1` タグ作成は行わない。
