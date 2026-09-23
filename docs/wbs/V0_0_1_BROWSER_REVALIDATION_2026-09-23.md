# Wanderloom v0.0.1 統合前ブラウザ検収再確認レポート

作成日: 2026-09-23
対象リポジトリ: `arnatoatadaink/wanderloom`
検収対象ブランチ: `feat/cp-19-m1-acceptance-loop`
統合予定先: `main`

## 1. 結論

**PASS — v0.0.1 baselineとしてmain統合可能。**

初回レポートで確認されたWorker起動エラーを修正し、Worker、Vite proxy、静的検証を再確認した。Web画面の最小構成および訓練導線はユーザーによるブラウザ確認で動作を確認済みである。

## 2. 再確認結果

| 項目 | 結果 | 備考 |
| --- | --- | --- |
| Worker起動 | PASS | `http://127.0.0.1:8787` で起動 |
| Worker health | PASS | `GET /api/health` がHTTP 200、`{"ok":true}` |
| Vite Web | PASS | `http://localhost:5173/` で起動 |
| `/api` proxy | PASS | ViteからWorker healthへ到達 |
| Typecheck | PASS | workspace全体 |
| Test | PASS | 52 tests |
| Build | PASS | Web、game-core、Worker dry-run |
| Diff check | PASS | `git diff --check` エラーなし |
| 初回ローカル訓練 | PASS | 10秒、Worker/D1非同期、報酬0 |
| ブラウザ最小挙動 | PASS | ユーザーによる確認済み |

## 3. 実装上の修正

- Worker entrypointからbooleanの名前付きexportを除去し、Wrangler runtimeの初期化エラーを解消した。
- API clientのデフォルトfetchをglobal fetchのラッパーに変更し、`Illegal invocation`を解消した。
- 初回訓練をブラウザ内のローカルタイマーとして実装し、通常APIの探索状態・報酬・inventoryを変更しないようにした。

## 4. 判定上の注意

今回の最小ブラウザ確認はユーザーの実機確認に基づく。Codex側ではブラウザの自動クリック・画面キャプチャを完遂していないため、厳密な自動E2E証跡ではない。ただし、ユーザー確認、起動確認、API疎通、静的検証は揃っており、今回指定されたv0.0.1 baselineの統合条件を満たすと判定する。

初回API訓練ゾーンと初期報酬は、ゲームバランス調整フォローアップへ分離した。現行v0.0.1の訓練は報酬0である。

## 5. 統合判定

```text
Result: PASS
Main integration: APPROVED
Tag v0.0.1: APPROVED
Blocking issues: none for the v0.0.1 baseline
```
