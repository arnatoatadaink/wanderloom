PRAGMA foreign_keys = ON;

CREATE TABLE players (
  player_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE player_core (
  player_id TEXT PRIMARY KEY NOT NULL,
  schema_version INTEGER NOT NULL,
  state_version INTEGER NOT NULL,
  level INTEGER NOT NULL,
  exp INTEGER NOT NULL,
  gold INTEGER NOT NULL,
  active_exploration_id TEXT,
  active_claim_nonce TEXT,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
  CHECK (
    (active_exploration_id IS NULL AND active_claim_nonce IS NULL)
    OR
    (active_exploration_id IS NOT NULL AND active_claim_nonce IS NOT NULL)
  )
);

CREATE TABLE player_inventory (
  player_id TEXT PRIMARY KEY NOT NULL,
  schema_version INTEGER NOT NULL,
  state_version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

CREATE TABLE recent_archive (
  player_id TEXT NOT NULL,
  exploration_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  zone_id TEXT NOT NULL,
  duration_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  result TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  synced_at TEXT,
  archive_json TEXT NOT NULL CHECK (json_valid(archive_json)),
  PRIMARY KEY (player_id, exploration_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
  CHECK (sync_status IN ('pending', 'synced')),
  CHECK (
    (sync_status = 'pending' AND synced_at IS NULL)
    OR
    (sync_status = 'synced' AND synced_at IS NOT NULL)
  )
);

CREATE TABLE player_mutation_guards (
  player_id TEXT PRIMARY KEY NOT NULL,
  guard_token TEXT NOT NULL,
  claim_nonce TEXT,
  acquired_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

CREATE INDEX idx_recent_archive_player_claimed_at
  ON recent_archive(player_id, claimed_at DESC);

CREATE INDEX idx_recent_archive_pending_sync
  ON recent_archive(player_id, claimed_at)
  WHERE sync_status = 'pending';

CREATE INDEX idx_player_core_active_exploration
  ON player_core(active_exploration_id)
  WHERE active_exploration_id IS NOT NULL;
