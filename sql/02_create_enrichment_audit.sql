-- =========================================================
-- Catalog Enrichment Audit Table (keysers_inventory)
-- =========================================================
-- This table tracks all Lensfun enrichment suggestions and
-- applications, co-located with the catalog_items they describe.

CREATE TABLE IF NOT EXISTS catalog_enrichment_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to catalog item
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  
  -- Lensfun match details
  lensfun_lens_id UUID NOT NULL, -- References LensfunLens in keysers_dashboard
  lensfun_maker VARCHAR(255) NOT NULL,
  lensfun_model VARCHAR(500) NOT NULL,
  
  -- Match scoring
  confidence_score NUMERIC(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_reasons TEXT[] NOT NULL DEFAULT '{}',
  
  -- Immutable audit snapshots
  catalog_output_text TEXT NOT NULL, -- Snapshot of output_text at match time
  catalog_make VARCHAR(255) NOT NULL, -- Snapshot of make at match time
  specs_before JSONB NOT NULL DEFAULT '{}', -- Complete specs before enrichment
  specs_after JSONB, -- Complete specs after application (NULL if pending)
  
  -- Suggested specifications (what Lensfun proposes)
  suggested_specs JSONB NOT NULL,
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW', 'AUTO_APPLIED', 'MANUALLY_APPROVED', 'REJECTED')),
  
  -- Review metadata
  review_notes TEXT,
  reviewed_by VARCHAR(255), -- User ID/email who reviewed
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrichment_catalog_item ON catalog_enrichment_suggestions(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_status ON catalog_enrichment_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_confidence ON catalog_enrichment_suggestions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_created ON catalog_enrichment_suggestions(created_at DESC);

-- Prevent duplicate suggestions for same catalog item + lensfun lens
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrichment_unique_match 
  ON catalog_enrichment_suggestions(catalog_item_id, lensfun_lens_id);

-- GIN index for JSONB specs searching
CREATE INDEX IF NOT EXISTS idx_enrichment_specs_before ON catalog_enrichment_suggestions USING gin(specs_before);
CREATE INDEX IF NOT EXISTS idx_enrichment_specs_after ON catalog_enrichment_suggestions USING gin(specs_after);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_enrichment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enrichment_updated_at
  BEFORE UPDATE ON catalog_enrichment_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_updated_at();

-- Comments
COMMENT ON TABLE catalog_enrichment_suggestions IS 'Audit trail for Lensfun enrichment suggestions and applications';
COMMENT ON COLUMN catalog_enrichment_suggestions.specs_before IS 'Complete snapshot of specifications JSONB before enrichment';
COMMENT ON COLUMN catalog_enrichment_suggestions.specs_after IS 'Complete snapshot of specifications JSONB after application (NULL if not yet applied)';
COMMENT ON COLUMN catalog_enrichment_suggestions.suggested_specs IS 'Lensfun-proposed specifications that were suggested/applied';
