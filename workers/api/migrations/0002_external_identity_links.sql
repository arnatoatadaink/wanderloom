PRAGMA foreign_keys = ON;

CREATE TABLE external_identity_links (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  player_id TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (provider, subject),
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
  UNIQUE (player_id, provider)
);

CREATE INDEX idx_external_identity_links_player
  ON external_identity_links(player_id);
