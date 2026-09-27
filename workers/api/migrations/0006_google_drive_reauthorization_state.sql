ALTER TABLE google_drive_authorizations
ADD COLUMN reauthorization_required INTEGER NOT NULL DEFAULT 0;

ALTER TABLE google_drive_authorizations
ADD COLUMN reauthorization_reason TEXT;
