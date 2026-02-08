-- =========================================================
-- Output Text Spec Parser Backfill Audit (Category A helper)
-- keysers_inventory
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS catalog_text_parse_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,

  parsed_from_text TEXT NOT NULL,
  parsed_focal JSONB,
  parsed_aperture JSONB,

  specs_before JSONB NOT NULL DEFAULT '{}'::jsonb,
  specs_after JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL, -- APPLIED | SKIPPED | AMBIGUOUS | NO_MATCH
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_text_parse_audit_item
  ON catalog_text_parse_audit(catalog_item_id);

CREATE INDEX IF NOT EXISTS idx_catalog_text_parse_audit_status
  ON catalog_text_parse_audit(status);

COMMENT ON TABLE catalog_text_parse_audit IS 'Audit trail for backfilling specs from catalog_items.output_text';

