# M4 ブラウザ失敗経路の実行手順 — 2026-09-27

## 確認結果と範囲

**API を模擬した実 Chromium の失敗経路: PASS — 6 tests / 29.8s。**

実行対象は local main `a73fb7177b8fc0bd730b29ea615e0eab71cf21b6` に
今回の未コミットのブラウザテスト基盤を追加した作業ツリー。
Node 22.20.0 / pnpm 10.17.1 / Playwright 1.63.0 /
Chromium 153.0.8010.12（Playwright revision 1243）で実行した。

| ブラウザ操作と失敗条件 | 実測結果 |
| --- | --- |
| claim 後の Drive 応答を保留し、その後 503 にする | PASS。応答前に結果・Gold +25・EXP +12・ドロップを表示し、装備操作が成功。失敗後も次の探索が開始でき、リロード後も 125 G / 22 XP と探索状態を保持。 |
| Drive 同期のネットワーク失敗 | PASS。ゲーム全体のエラーにならず、同意・再接続なしで再試行成功。 |
| Drive 同期の HTTP 429 | PASS。同意・再接続なしで再試行成功。 |
| Drive 同期の HTTP 503 | PASS。同意・再接続なしで再試行成功。 |
| API が保存済み reconnect-required を返す | PASS。リロード後も再接続操作を表示。探索・claim で自動 OAuth / 自動 sync は発生せず、Reconnect のクリック後だけ認可・同期が成功。 |
| GIS の popup_closed コールバック | PASS。キャンセルは Drive の表示に留まり、探索・claim を操作可能。再度クリックすると認可・同期成功。 |

通信失敗 / 429 / 503 の各テストでは、続く Drive 状態読み込みにも一度 503 を
与え、`Temporarily unavailable` → `Retry Drive archive` → `Connected` を確認する。
各テストで未定義 API 要求・外部 HTTP 要求・未処理ブラウザ例外がないことを確認した。

これは実アプリの DOM・クリック・fetch・localStorage・リロードを Chromium で検証する
回帰テスト。Google OAuth・Drive API・Worker・D1 はこの実行の対象外。
Google の実際の同意画面やポップアップを閉じる挙動、実 credential の分類・永続化は
この PASS では証明しない。実プロバイダーの失敗経路の手動検証は引き続き未確認。
Worker の分類・永続化は既存の CP-39 統合テストなどが担当する。

## 通常のローカル実行

リポジトリのルートで実行する。Node は `.nvmrc` のバージョンを使う。

```bash
nvm use
pnpm install --frozen-lockfile
pnpm --filter @wanderloom/web exec playwright install --with-deps chromium
pnpm --filter @wanderloom/web typecheck:browser
pnpm --filter @wanderloom/web test:browser
```

Linux の `--with-deps` は OS ライブラリの導入に管理者権限が必要な場合がある。
すでに必要な OS ライブラリがある環境では `playwright install chromium` だけでよい。
テスト自身が Vite を起動し、終了時に停止する。Worker の起動や Google の資格情報は不要。

既存の web チェック:

```bash
pnpm --filter @wanderloom/web typecheck
pnpm --filter @wanderloom/web test
pnpm --filter @wanderloom/web build
```

今回の実測ではすべて PASS。Vitest は 14 files / 48 tests、browser 用の追加型チェックも
PASS。`vitest.config.ts` で `src/**/*.test.ts` のみを対象にし、Playwright の e2e は独立して実行する。

## 今回の WSL 環境で使った一時ライブラリ

Chromium の初回実行は `libasound.so.2` 不足で起動できなかった。
`ldd` で不足がこのライブラリのみと確認し、sudo の代わりに Ubuntu noble の
`libasound2t64` 1.2.11-1ubuntu0.3 を `/tmp` に展開した。
システムパッケージ・プロダクション設定・リポジトリにバイナリを追加していない。

```bash
mkdir -p /tmp/wanderloom-playwright-libs
cd /tmp/wanderloom-playwright-libs
apt-get download libasound2t64
dpkg-deb -x libasound2t64_*.deb extracted
cd /mnt/c/users/y/projects/codex_work/wanderloom
export PATH=/home/y/.nvm/versions/node/v22.20.0/bin:/home/y/.local/share/pnpm:$PATH
LD_LIBRARY_PATH=/tmp/wanderloom-playwright-libs/extracted/usr/lib/x86_64-linux-gnu \
  pnpm --filter @wanderloom/web test:browser
```

この一時展開は `/tmp` の消去後に再作成が必要。
他の OS・ディストリビューションでは通常の Playwright 依存導入手順を使う。
依存インストール時に既存の WSL `node_modules` と Windows パスの大文字小文字による
virtual-store 不一致が出たため、今回の package add は既存の virtual store を指定した:

```bash
pnpm --virtual-store-dir /mnt/c/Users/Y/Projects/codex_work/wanderloom/node_modules/.pnpm \
  --filter @wanderloom/web add -D -E @playwright/test@1.63.0
```

新規 clone ではこの環境固有の指定は不要。

## 模擬データと接続先

- 専用 Vite は `127.0.0.1:4177` / `--strictPort`。既存サーバーを再利用しない。
- Vite の起動は stdout の `Local:` を待つ。この環境では起動前の未使用 loopback
  ポートへの HTTP / TCP 確認が止まったため、この Playwright の正式な待機方法を使う。
- `VITE_GOOGLE_CLIENT_ID` はテスト起動時に固定のダミー ID で上書きする。
- `page.addInitScript` で GIS のインターフェースを模擬し、認可要求回数を数える。
  キャンセルは `error_callback({ type: "popup_closed" })` を発生させる。
- `/api/**` はすべて Playwright の route で応答する。未定義ルートは失敗として記録し、
  実 Worker へ転送しない。別 origin の HTTP 要求も遮断・失敗として記録する。
- 各テストは独立したブラウザコンテキストと固定のプレイヤー ID を使う。
  フィクスチャの core / inventory / Drive 状態はメモリ内にあり、
  同じテストのリロードで再読込できる。ローカル D1 や通常利用中のブラウザデータには触れない。
- 本番アプリのコード・挙動は変更していない。

## スクリーンショット・トレース・レポート

全 6 件の最終画面と操作トレースを生成する。HTML レポートも生成する。
出力は `.gitignore` に登録してあり、次の実行で置き換わるため、保存が必要なら事前にコピーする。

```bash
pnpm --filter @wanderloom/web test:browser:report
pnpm --filter @wanderloom/web exec playwright show-trace \
  test-results/m4-failures-claim-remains--ab5e1-ing-and-after-Drive-failure-chromium/trace.zip
```

レポート: `apps/web/playwright-report/index.html`。
画像・トレース: `apps/web/test-results/*/test-finished-1.png` / `trace.zip`。
トレースでは結果表示、装備、Drive 失敗、次の探索、認可要求数を検証する assertion の順序を確認できる。

API route と GIS の模擬方法は [Playwright API mocking](https://playwright.dev/docs/mock)、
起動待機は [Playwright webServer](https://playwright.dev/docs/test-webserver)、
トレース閲覧は [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer) を参照。
