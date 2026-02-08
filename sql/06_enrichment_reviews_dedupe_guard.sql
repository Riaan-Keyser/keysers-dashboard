-- =========================================================
-- Enrichment Reviews Dedupe Guard (Category B hygiene)
-- keysers_inventory
-- =========================================================
-- Add SUPERSEDED status and columns for tracking superseded reviews.
-- Unique index creation is DEFERRED until after cleanup script runs.

-- Add superseded tracking columns if missing
ALTER TABLE catalog_enrichment_suggestions
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID;

-- Update status constraint to include SUPERSEDED
ALTER TABLE catalog_enrichment_suggestions
  DROP CONSTRAINT IF EXISTS catalog_enrichment_suggestions_status_check;

ALTER TABLE catalog_enrichment_suggestions
  ADD CONSTRAINT catalog_enrichment_suggestions_status_check
  CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'AUTO_APPLIED', 'SUPERSEDED'));

-- Add index for superseded rows (for debugging/auditing)
CREATE INDEX IF NOT EXISTS idx_enrichment_superseded_at
  ON catalog_enrichment_suggestions(superseded_at)
  WHERE status = 'SUPERSEDED';

-- NOTE: Partial unique index creation is DEFERRED to after cleanup.
-- After running scripts/dedupe_pending_enrichment_reviews.ts, run:
--
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_enrichment_one_pending_per_item
--   ON catalog_enrichment_suggestions(catalog_item_id)
--   WHERE status = 'PENDING_REVIEW';
--
-- This index enforces: at most ONE PENDING_REVIEW per catalog_item_id.

COMMENT ON COLUMN catalog_enrichment_suggestions.superseded_at IS 'When this suggestion was superseded by a newer/better one';
COMMENT ON COLUMN catalog_enrichment_suggestions.superseded_by_id IS 'ID of the suggestion that superseded this one';
