-- ========================================
-- CATALOG CLEANUP: Phase 1 - Create New Tables
-- ========================================
-- This creates the new standardized catalog structure
-- The old equipment_inventory table is preserved

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========================================
-- Canonical Catalog Items Table
-- ========================================

CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core identification
  make VARCHAR(255) NOT NULL,
  product_type VARCHAR(100) NOT NULL,
  output_text TEXT NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Pricing (never null, default 0)
  buy_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  buy_high NUMERIC(10,2) NOT NULL DEFAULT 0,
  consign_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  consign_high NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Standardized specifications (JSONB)
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Legacy data reference
  legacy_id INTEGER UNIQUE, -- Links back to equipment_inventory.id
  legacy_data JSONB, -- Stores original row for reference
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_pricing CHECK (
    buy_low >= 0 AND buy_high >= buy_low AND
    consign_low >= 0 AND consign_high >= consign_low
  )
);

-- Indexes for performance
CREATE INDEX idx_catalog_make ON catalog_items(make);
CREATE INDEX idx_catalog_product_type ON catalog_items(product_type);
CREATE INDEX idx_catalog_active ON catalog_items(is_active) WHERE is_active = true;
CREATE INDEX idx_catalog_legacy_id ON catalog_items(legacy_id);

-- GIN index for specifications JSONB queries
CREATE INDEX idx_catalog_specifications ON catalog_items USING GIN (specifications);

-- Full-text search on output_text
CREATE INDEX idx_catalog_output_text_search ON catalog_items USING GIN (to_tsvector('english', output_text));

COMMENT ON TABLE catalog_items IS 'Standardized catalog with clean specifications and pricing';
COMMENT ON COLUMN catalog_items.output_text IS 'Canonical user-facing product name (never modified by matching)';
COMMENT ON COLUMN catalog_items.specifications IS 'Standardized JSONB specs with source and confidence';
COMMENT ON COLUMN catalog_items.legacy_id IS 'Reference to original equipment_inventory.id';

-- ========================================
-- Normalized OCR Aliases Table
-- ========================================

CREATE TABLE IF NOT EXISTS catalog_ocr_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  
  -- Alias text (normalized: lowercase, trimmed)
  alias_text VARCHAR(500) NOT NULL,
  
  -- Priority (1 = highest, for disambiguation)
  priority INT DEFAULT 1,
  
  -- Metadata
  source VARCHAR(50) NOT NULL, -- "manual", "import", "generated", "ocr"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_alias_per_item UNIQUE(catalog_item_id, alias_text)
);

-- Indexes for fast OCR matching
CREATE INDEX idx_aliases_text ON catalog_ocr_aliases(alias_text);
CREATE INDEX idx_aliases_text_trgm ON catalog_ocr_aliases USING GIN (alias_text gin_trgm_ops);
CREATE INDEX idx_aliases_item_id ON catalog_ocr_aliases(catalog_item_id);
CREATE INDEX idx_aliases_priority ON catalog_ocr_aliases(catalog_item_id, priority);

COMMENT ON TABLE catalog_ocr_aliases IS 'Normalized OCR matching aliases for catalog items';
COMMENT ON COLUMN catalog_ocr_aliases.alias_text IS 'Normalized lowercase alias for fuzzy matching';
COMMENT ON COLUMN catalog_ocr_aliases.priority IS 'Match priority (1=highest) for disambiguation';

-- ========================================
-- Trigger for updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Validation Function for Lens Specs
-- ========================================

CREATE OR REPLACE FUNCTION validate_lens_specs()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for lens products
  IF NEW.product_type ILIKE '%lens%' THEN
    -- Check for mount (required for lenses)
    IF (NEW.specifications->>'mount' IS NULL AND 
        NEW.specifications->'mounts' IS NULL) THEN
      RAISE WARNING 'Lens product % missing mount specification', NEW.id;
    END IF;
    
    -- Check for focal length (required for lenses)
    IF NEW.specifications->>'focal_min_mm' IS NULL THEN
      RAISE WARNING 'Lens product % missing focal_min_mm specification', NEW.id;
    END IF;
    
    -- Check for aperture (required for lenses)
    IF NEW.specifications->>'aperture_min' IS NULL THEN
      RAISE WARNING 'Lens product % missing aperture_min specification', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_lens_specs
  BEFORE INSERT OR UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_lens_specs();

-- ========================================
-- Success Message
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Catalog tables created successfully!';
  RAISE NOTICE '   - catalog_items: main product catalog';
  RAISE NOTICE '   - catalog_ocr_aliases: normalized matching aliases';
  RAISE NOTICE '   - Indexes and triggers configured';
  RAISE NOTICE '   - Ready for data backfill';
END $$;
