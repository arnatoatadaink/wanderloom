#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

expected_migrations=(
  0001_initial.sql
  0002_external_identity_links.sql
  0003_archive_export_state.sql
  0004_google_drive_authorizations.sql
  0005_archive_export_delivery_lease.sql
  0006_google_drive_reauthorization_state.sql
)

mapfile -t actual_migrations < <(
  find workers/api/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort
)

if [[ "${actual_migrations[*]}" != "${expected_migrations[*]}" ]]; then
  echo "CP-42 migration set mismatch" >&2
  echo "Expected: ${expected_migrations[*]}" >&2
  echo "Actual:   ${actual_migrations[*]}" >&2
  exit 1
fi

echo "[CP-42] migrations 0001-0006: PASS"

echo "[CP-42] workspace typecheck"
pnpm typecheck

echo "[CP-42] workspace tests"
pnpm test

echo "[CP-42] workspace build / Wrangler dry-run"
pnpm build

echo "[CP-42] full automated acceptance: PASS"
