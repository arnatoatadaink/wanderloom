ALTER TABLE archive_export_state
  ADD COLUMN delivery_lease_token TEXT;

ALTER TABLE archive_export_state
  ADD COLUMN delivery_lease_until TEXT;

CREATE INDEX idx_archive_export_delivery_lease
  ON archive_export_state(delivery_lease_until)
  WHERE remote_id IS NULL;
