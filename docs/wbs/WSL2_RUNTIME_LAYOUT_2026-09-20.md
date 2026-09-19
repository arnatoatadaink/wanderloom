# Wanderloom Windows正本 / WSL2実行環境 配置作業レポート

Date: 2026-09-20  
Branch: `feat/b-001-b-004-domain-contracts`

## 1. 目的

Wanderloom のローカル開発環境を、以下の制約下で安定して運用できるよう整理する。

- Git working tree の正本は Windows NTFS 上に維持する。
- Codex Desktop のバックエンドおよび Node.js / pnpm 等の実行母体は WSL2 とする。
- WSL2 から `/mnt/c/.../wanderloom` を参照して開発・テスト・ビルドを行う。
- `/mnt/c` 越しI/Oの性能低下は完全には解消できないため、高I/Oな実行時データを可能な範囲で WSL2 ext4 側へ配置する。
- Windows Native と WSL2 の双方から同じ `node_modules` を共有する構成は採用しない。

本作業では、ソースコードの配置変更やアプリケーション仕様変更を主目的としない。

## 2. 現在の構成

### Windows側: 正本

例:

```text
C:\Users\Y\Projects\codex_work\wanderloom
```

WSL2 からは以下として参照する。

```text
/mnt/c/Users/Y/Projects/codex_work/wanderloom
```

Windows側に残すもの:

```text
wanderloom/
├── .git/
├── apps/
├── packages/
├── workers/
├── docs/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig*
└── その他Git管理対象
```

Git操作、Codex Desktopによる編集、正本管理はこの working tree を基準とする。

## 3. WSL2側の役割

WSL2は以下を担当する。

- Node.js実行
- pnpm実行
- Vitest
- TypeScript compiler
- Vite
- Wrangler
- ローカルDB処理
- 将来的なruntime service
- 一時データ
- cache
- archive
- snapshot
- test/runtime state

現行環境で確認済みの実行系:

```text
Node:
~/.nvm/versions/node/v22.20.0/bin/node

pnpm:
~/.local/share/pnpm/pnpm
```

Windows側Node.jsはWanderloomの標準実行系として使用しない。

## 4. 基本原則

### 4.1 ソースコード

ソースコードはWindows正本から移動しない。

```text
/mnt/c/Users/Y/Projects/codex_work/wanderloom
```

をWSL2から直接参照する。

これは性能上の最適構成ではないが、Codex Desktopとの互換性を優先した意図的な選択である。

### 4.2 Runtime Data

大量または高頻度I/Oが発生するruntime dataは可能な限りWSL2側へ配置する。

```text
Source / Git
    Windows NTFS

Execution
    WSL2

Runtime high-I/O data
    WSL2 ext4
```

## 5. WSL2側ディレクトリ構成

以下を標準配置候補とする。

```text
~/.local/share/wanderloom/
├── db/
├── snapshots/
└── archive/

~/.cache/wanderloom/
├── app/
└── wrangler/

~/.local/state/wanderloom/
├── logs/
└── tmp/
```

作成コマンド:

```bash
mkdir -p \
  ~/.local/share/wanderloom/db \
  ~/.local/share/wanderloom/snapshots \
  ~/.local/share/wanderloom/archive \
  ~/.cache/wanderloom/app \
  ~/.cache/wanderloom/wrangler \
  ~/.local/state/wanderloom/logs \
  ~/.local/state/wanderloom/tmp
```

確認:

```bash
find \
  ~/.local/share/wanderloom \
  ~/.cache/wanderloom \
  ~/.local/state/wanderloom \
  -maxdepth 2 -type d | sort
```

## 6. 第一優先でWSL2へ配置する対象

### 6.1 Database

候補:

```text
~/.local/share/wanderloom/db/
```

対象:

- development DB
- test DB
- SQLite系DB
- D1 local persistence
- その他runtime database

DBファイルがWSL2に存在する場合、そのDBへアクセスするプロセスも原則WSL2側で実行する。

Windowsプロセスから `\\wsl.localhost\...` 経由でSQLiteファイルを直接開く構成は採用しない。

### 6.2 Snapshot

候補:

```text
~/.local/share/wanderloom/snapshots/
```

snapshotがDB状態とatomicityを持つ場合、DBと同一のWSL2側ファイルシステムに配置する。

避ける構成:

```text
DB       -> WSL2
snapshot -> Windows NTFS
```

atomic writeやrename等の境界をWindows/WSL間にまたがせない。

### 6.3 Archive

候補:

```text
~/.local/share/wanderloom/archive/
```

対象例:

- snapshot archive
- historical game state
- replay data
- import/export中間保存
- 長期保存対象のruntime data

archiveはGit working treeから独立させる。

### 6.4 Cache

候補:

```text
~/.cache/wanderloom/
```

対象例:

- application cache
- download cache
- generated metadata
- transient analysis data
- Wrangler関連cache

再生成可能なデータのみを配置する。

### 6.5 Temporary Data

候補:

```text
~/.local/state/wanderloom/tmp/
```

必要に応じて:

```bash
export WANDERLOOM_TMP_DIR="$HOME/.local/state/wanderloom/tmp"
```

アプリケーション全体の `TMPDIR` を変更する場合は、他ツールへの影響を確認してから行う。

### 6.6 Logs

候補:

```text
~/.local/state/wanderloom/logs/
```

大量ログのみを対象とし、Git管理対象となるテストfixtureや検証結果とは分離する。

## 7. pnpm Store

最初に以下を確認する。

```bash
pnpm store path
```

期待する状態は `/home/y/...` 配下など、WSL2 ext4上にあること。

例:

```text
/home/y/.local/share/pnpm/store/v10
```

`/mnt/c/...` を指している場合はWSL2側へ移すことを検討する。

pnpm storeはWindows環境と共有しない。

## 8. node_modules

現段階では `node_modules` のWSL2 ext4移動は第一段階では実施しない。

現在:

```text
/mnt/c/.../wanderloom/node_modules
```

にある場合でも、まず他のruntime I/OをWSL2へ逃がした後に性能を測定する。

理由:

- pnpmはsymlinkを多用する。
- `/mnt/c` working treeとext4上の`node_modules`を跨ぐ構成には追加検証が必要。
- TypeScript language server等との組み合わせ確認が必要。
- Codex Desktopからの操作への副作用が未確認。

禁止:

- `node_modules`だけを無検証でWSLへ移動
- `node_modules`を適当にsymlink
- Windows NodeとWSL Nodeから同一`node_modules`を共有

## 9. Wrangler / D1

Wranglerによるローカルstate生成場所を確認する。

探索例:

```bash
cd /mnt/c/Users/Y/Projects/codex_work/wanderloom

find . \
  -path '*/node_modules' -prune -o \
  \( -name '.wrangler' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' \) \
  -print
```

`.wrangler` やD1 local stateが大量I/Oを発生する場合、Wranglerがサポートする保存先設定を使用してWSL2側への配置を検討する。

設定方法を確認せず `.wrangler` をsymlink化しない。

## 10. Build Output

現段階ではWindows working tree内の既存出力先を維持する。

例:

```text
apps/web/dist
packages/game-core/dist
workers/api/dist
```

現在のビルド時間が開発上問題になるまでは変更しない。

将来の性能改善候補としてWSL2 cache directoryへの出力を検討できる。

## 11. 移行しないもの

以下は原則Windows正本に残す。

```text
.git/
apps/
packages/
workers/
docs/

package.json
pnpm-lock.yaml
pnpm-workspace.yaml

tsconfig*.json
vite.config.*
vitest.config.*
wrangler.toml / wrangler.jsonc
その他Git管理対象
```

特に `.git` のみをWSL2へ移動しない。

## 12. runtime pathのコード側対応

DB / snapshot / archiveについて、ハードコードされた保存先が存在する場合は、将来的に設定可能にする。

候補となる環境変数:

```text
WANDERLOOM_DATA_DIR
WANDERLOOM_DB_DIR
WANDERLOOM_SNAPSHOT_DIR
WANDERLOOM_ARCHIVE_DIR
WANDERLOOM_CACHE_DIR
WANDERLOOM_STATE_DIR
```

例:

```bash
export WANDERLOOM_DATA_DIR="$HOME/.local/share/wanderloom"
export WANDERLOOM_DB_DIR="$HOME/.local/share/wanderloom/db"
export WANDERLOOM_SNAPSHOT_DIR="$HOME/.local/share/wanderloom/snapshots"
export WANDERLOOM_ARCHIVE_DIR="$HOME/.local/share/wanderloom/archive"
export WANDERLOOM_CACHE_DIR="$HOME/.cache/wanderloom"
export WANDERLOOM_STATE_DIR="$HOME/.local/state/wanderloom"
```

既存仕様にこれらの環境変数が存在しない場合、勝手に実装しない。

まず現在の保存先実装を特定する。

## 13. ローカル側で最初に実施する探索

working treeへ移動:

```bash
cd /mnt/c/Users/Y/Projects/codex_work/wanderloom
```

Git確認:

```bash
git status -sb
```

runtime data候補を検索:

```bash
find . \
  -path '*/node_modules' -prune -o \
  \( \
    -name '*.db' \
    -o -name '*.sqlite' \
    -o -name '*.sqlite3' \
    -o -name '.wrangler' \
    -o -name '.cache' \
    -o -name 'cache' \
    -o -name 'tmp' \
    -o -name 'archive' \
    -o -name 'snapshots' \
  \) \
  -print
```

コード上の保存先参照を検索:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  -E \
  'sqlite|database|snapshot|archive|appData|cache|tmp|wrangler|persist' \
  apps packages workers
```

package scripts確認:

```bash
cat package.json
```

workspace確認:

```bash
pnpm -r list --depth -1
```

pnpm store確認:

```bash
pnpm store path
```

## 14. 配置作業の実施順序

1. WSL2 runtime directories作成。
2. pnpm storeがWSL2 ext4にあることを確認。
3. 現在のDB / snapshot / archive / cache / Wrangler state保存先を探索。
4. 保存先変更が既存設定のみで可能なものをWSL2へ変更。
5. 既存設定で変更できないものを一覧化。この段階ではコード変更しない。
6. コード変更が必要なものについて個別タスク化する。
7. 配置変更後に既存検収セットを再実行する。

## 15. 検収

最低限以下を実行する。

```bash
pnpm --filter @wanderloom/game-core test
pnpm -r typecheck
pnpm -r test
pnpm -r build
git diff --check
git status -sb
```

期待結果:

- game-core test成功
- workspace typecheck成功
- workspace test成功
- workspace build成功
- `git diff --check` エラーなし
- runtime配置作業に伴う意図しないGit差分なし

## 16. 性能測定

配置変更前後を比較する場合は、最低限以下を測定する。

```bash
time pnpm --filter @wanderloom/game-core test
time pnpm -r typecheck
time pnpm -r build
```

測定値は可能なら3回取得する。

初回はcache warm-upの影響を受ける可能性があるため、初回と2回目以降を区別する。

実測値と推測値を混同しない。

## 17. 禁止事項

この作業では以下を行わない。

- Git working treeのWSL2への移動
- `.git`のみの移動
- Windows正本の削除
- package lockの不用意な更新
- Node.js major version変更
- pnpm version変更
- `node_modules` の無検証symlink化
- DBファイルをWindows NodeからWSL filesystem越しに直接操作
- DB / snapshotのatomicity境界をWindowsとWSLに分割
- runtime path変更とゲーム仕様変更を同一タスクで行う

## 18. 完了条件

第一段階の配置作業は以下を満たした時点で完了とする。

- Windows working treeを正本として維持している。
- Node / pnpmはWSL2版を使用している。
- pnpm storeはWSL2 ext4にある。
- runtime用WSL2ディレクトリが作成されている。
- DB保存先が特定されている。
- snapshot保存先が特定されている。
- archive保存先が特定されている。
- Wrangler/D1 local state保存先が特定されている。
- WSL2へ移行可能なruntime dataが移行されている。
- 移行不能またはコード変更が必要な対象が一覧化されている。
- 全テスト・型検査・ビルドが成功する。
- Git working treeに意図しない変更がない。

## 19. 次工程

配置作業後、以下を別タスクとして判断する。

1. `node_modules` のext4配置による性能改善検証
2. Build outputのext4化
3. Wrangler/D1 local persistence最適化
4. runtime path設定インターフェースの正式仕様化
5. Windows/WSL混在環境用bootstrap script作成
6. CIとローカル環境差異の整理

特に `node_modules` は、現状のテスト・型検査時間をbaselineとして保存し、移行後の実測値で採否を判断する。

## 20. Lunaでの実行可否

このレポートを実行仕様として与える場合、Lunaでも以下は実施可能と判断する。

- 現在の保存先探索
- pnpm store確認
- runtime directory作成
- 既存設定による保存先変更
- テスト / typecheck / build / diff-check
- コード変更が必要な項目の一覧化

一方、以下に到達した場合はTerra/Solへ切り替える。

- pnpm `node_modules` をWSL2 ext4へ分離する設計
- Wrangler/D1の保存先変更が既存設定では不可能
- atomic snapshot設計へ影響
- Windows/WSL境界を跨ぐSQLiteロック問題
- runtime path抽象化が複数packageへ波及
- WBS/CPの前提変更が必要
