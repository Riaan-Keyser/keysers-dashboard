-- =========================================================
-- Blocking Catalog Issues (Category A) - keysers_inventory
-- =========================================================
-- Persistent issue rows for catalog_items that require human intervention.
-- Rules:
-- - Idempotent OPEN issues: unique on (catalog_item_id, issue_type) where status='OPEN'
-- - RESOLVED issues are never deleted; they can be re-opened by creating a new OPEN row
-- - Scanner updates last_detected_at/details for existing OPEN issues
-- - Scanner auto-resolves OPEN issues that no longer apply

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS catalog_blocking_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,

  severity TEXT NOT NULL DEFAULT 'BLOCKING',
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, RESOLVED

  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,

  first_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolved_by_user_id TEXT NULL,
  resolution_note TEXT NULL
);

-- Idempotency for OPEN issues only
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_blocking_issues_open
  ON catalog_blocking_issues(catalog_item_id, issue_type)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_catalog_blocking_issues_status_type
  ON catalog_blocking_issues(status, issue_type);

CREATE INDEX IF NOT EXISTS idx_catalog_blocking_issues_item_status
  ON catalog_blocking_issues(catalog_item_id, status);

CREATE INDEX IF NOT EXISTS idx_catalog_blocking_issues_details_gin
  ON catalog_blocking_issues USING gin(details);

COMMENT ON TABLE catalog_blocking_issues IS 'Persistent blocking issues detected on catalog_items (Category A)';
