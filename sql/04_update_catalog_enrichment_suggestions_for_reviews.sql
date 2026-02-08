-- =========================================================
-- Pending Enrichment Reviews (Category B) - keysers_inventory
-- =========================================================
-- Ensure catalog_enrichment_suggestions supports review queue fields + indexes.

-- Rename columns to match current API contract (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='catalog_enrichment_suggestions' AND column_name='review_notes'
  ) THEN
    EXECUTE 'ALTER TABLE catalog_enrichment_suggestions RENAME COLUMN review_notes TO review_note';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='catalog_enrichment_suggestions' AND column_name='reviewed_by'
  ) THEN
    EXECUTE 'ALTER TABLE catalog_enrichment_suggestions RENAME COLUMN reviewed_by TO reviewed_by_user_id';
  END IF;
END $$;

-- Ensure required columns exist
ALTER TABLE catalog_enrichment_suggestions
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS specs_after JSONB;

-- Status constraint (normalize to: PENDING_REVIEW | APPROVED | REJECTED | AUTO_APPLIED)
ALTER TABLE catalog_enrichment_suggestions
  DROP CONSTRAINT IF EXISTS catalog_enrichment_suggestions_status_check;

ALTER TABLE catalog_enrichment_suggestions
  ADD CONSTRAINT catalog_enrichment_suggestions_status_check
  CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'AUTO_APPLIED'));

-- Helpful indexes for review queue
CREATE INDEX IF NOT EXISTS idx_enrichment_status_confidence
  ON catalog_enrichment_suggestions(status, confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_item_status
  ON catalog_enrichment_suggestions(catalog_item_id, status);

