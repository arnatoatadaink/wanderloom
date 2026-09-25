PRAGMA foreign_keys = ON;

CREATE TABLE archive_export_state (
  player_id TEXT NOT NULL,
  exploration_id TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  last_error_code TEXT,
  last_error_retryable INTEGER,
  remote_id TEXT,
  synced_at TEXT,
  PRIMARY KEY (player_id, exploration_id),
  FOREIGN KEY (player_id, exploration_id)
    REFERENCES recent_archive(player_id, exploration_id)
    ON DELETE CASCADE,
  CHECK (attempt_count >= 0),
  CHECK (last_error_retryable IS NULL OR last_error_retryable IN (0, 1)),
  CHECK (
    (remote_id IS NULL AND synced_at IS NULL)
    OR
    (remote_id IS NOT NULL AND synced_at IS NOT NULL)
  )
);

CREATE INDEX idx_archive_export_retry
  ON archive_export_state(last_error_retryable, last_attempt_at)
  WHERE remote_id IS NULL;
