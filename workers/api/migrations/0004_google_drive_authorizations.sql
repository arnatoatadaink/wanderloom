PRAGMA foreign_keys = ON;

CREATE TABLE google_drive_authorizations (
  player_id TEXT PRIMARY KEY NOT NULL,
  refresh_token_ciphertext TEXT NOT NULL,
  refresh_token_iv TEXT NOT NULL,
  granted_scope TEXT NOT NULL,
  authorized_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
