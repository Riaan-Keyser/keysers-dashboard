# Lensfun Integration Guide

## Overview

The Keysers Dashboard includes a **Lensfun offline mirror** integration that automatically enriches catalog lens specifications with data from the open-source [Lensfun database](https://lensfun.github.io/).

Lensfun provides:
- Accurate lens specifications (focal length, aperture, mount compatibility)
- Lens correction calibration data (distortion, vignetting, chromatic aberration)
- Community-maintained database of thousands of lenses

## Architecture

### Database Schema

The integration uses two new Prisma models:

**`LensfunLens`** - Offline mirror of Lensfun database
- Stores lens specifications from Lensfun XML files
- Includes normalized search fields for fast matching
- Indexed on maker, model, and mounts

**`CatalogEnrichmentSuggestion`** - Match suggestions
- Links catalog items to Lensfun lenses
- Stores confidence scores and match reasons
- Tracks review status (AUTO_APPLIED, PENDING_REVIEW, APPROVED, REJECTED)

### Canonical Matching Function

**Location:** `lib/lensfunMatchConfidence.ts`

This is the **SINGLE source of truth** for all Lensfun matching logic. The scoring algorithm uses:

1. **Maker matching (25% weight)**
   - Exact match, alias matching (e.g., "Fujifilm" = "Fuji")
   - Substring matching

2. **Model similarity (50% weight)**
   - String similarity (trigram-based)
   - Token matching (focal lengths, apertures, series markers)
   - Example tokens: "24-105mm", "f2.8", "L", "IS", "USM"

3. **Mount compatibility (15% weight)**
   - Checks for mount overlap
   - Penalizes known incompatibilities (e.g., RF vs EF)

4. **Spec consistency (10% weight)**
   - Validates focal length and aperture against catalog data
   - Penalizes significant mismatches

**Final score:** 0.0 - 1.0 (0% - 100% confidence)

### Confidence Thresholds

| Score Range | Action | Status | Description |
|-------------|--------|--------|-------------|
| **≥ 0.85** | Auto-apply | `AUTO_APPLIED` | High confidence - specs automatically merged |
| **0.65 - 0.85** | Suggest | `PENDING_REVIEW` | Medium confidence - requires admin review |
| **< 0.65** | Skip | N/A | Low confidence - no action taken |

## Usage

### 1. Import Lensfun Database

Download and import Lensfun XML files into your local database:

```bash
# Download XML files from Lensfun GitHub repo
npx tsx scripts/import_lensfun.ts

# Or use existing files (skip download)
npx tsx scripts/import_lensfun.ts --offline
```

This will:
- Download ~20 XML files from Lensfun repo
- Parse lens entries
- Normalize and tokenize for matching
- Insert into `lensfun_lenses` table

**Expected results:**
- ~10,000+ lens entries
- Grouped by maker (Canon, Nikon, Sony, Sigma, Tamron, etc.)

### 2. Enrich Catalog Items

Match catalog lens products with Lensfun database:

```bash
# Dry run (preview without changes)
npx tsx scripts/enrich_catalog_from_lensfun.ts --dry-run

# Live run (apply changes)
npx tsx scripts/enrich_catalog_from_lensfun.ts

# Re-process items with existing enrichment
npx tsx scripts/enrich_catalog_from_lensfun.ts --force
```

**What happens:**
- For each `LENS` product in the catalog:
  1. Find Lensfun candidates with same maker
  2. Score all candidates using `computeLensfunMatchConfidence()`
  3. Take top match
  4. If score ≥ 0.85: Auto-fill specs
  5. If score 0.65-0.85: Create suggestion for review
  6. If score < 0.65: Skip (no match)

### 3. Review Suggestions (Dashboard)

For items with 0.65-0.85 confidence:
- Navigate to **Catalog Management** → **Lensfun Suggestions**
- Review match reasons and proposed specs
- Approve or reject each suggestion
- Approved suggestions merge into catalog specs

## Data Safety

### Non-Destructive Enrichment

The enrichment process **never overwrites** existing data:

✅ **Safe operations:**
- Adds `specifications.lensfun` object with match details
- Fills missing spec fields (mount, focal, aperture)
- Creates audit trail in `CatalogEnrichmentSuggestion`

❌ **Never touches:**
- `output_text` (canonical product name)
- `name`, `brand`, `model` fields
- Manually-entered specifications (unless `--force`)

### Rollback Strategy

If enrichment produces bad results:

```sql
-- Revert auto-applied enrichments
UPDATE products
SET specifications = specifications - 'lensfun'
WHERE specifications->>'lensfun' IS NOT NULL;

-- Delete suggestions
DELETE FROM catalog_enrichment_suggestions;

-- Re-run with different thresholds (adjust code)
```

## Enriched Data Structure

After enrichment, `Product.specifications` contains:

```jsonc
{
  // Existing catalog data
  "mount": "Canon EF",
  "focal_min_mm": 24,
  "focal_max_mm": 105,
  "aperture_min": 4.0,
  
  // Lensfun enrichment
  "lensfun": {
    "match_score": 0.92,
    "lensfun_lens_id": "uuid-here",
    "maker": "Canon",
    "model": "EF 24-105mm f/4L IS USM",
    "mounts": ["Canon EF"],
    "focal_min_mm": 24,
    "focal_max_mm": 105,
    "aperture_min": 4.0,
    "aperture_max": 22.0,
    "reasons": [
      "Maker match: 100% (Canon vs Canon)",
      "Model similarity: 95% base, +15% token boost = 100%",
      "  Matching tokens: 24-105mm, f4, l, is, usm",
      "Mount compatibility: 100% (catalog: Canon EF, lensfun: Canon EF)",
      "Spec consistency: 100%",
      "FINAL SCORE: 92.0% (weights: maker 25%, model 50%, mount 15%, spec 10%)"
    ],
    "enriched_at": "2026-02-08T14:30:00Z"
  },
  
  "source": "lensfun",
  "confidence": 0.92
}
```

## Maintenance

### Refresh Lensfun Data

Lensfun updates periodically. To refresh:

```bash
# Delete existing data
psql keysers_dashboard -c "TRUNCATE lensfun_lenses CASCADE;"

# Re-import (will download latest XML)
npx tsx scripts/import_lensfun.ts

# Re-enrich catalog
npx tsx scripts/enrich_catalog_from_lensfun.ts --force
```

### Monitor Match Quality

```sql
-- Check confidence score distribution
SELECT 
  CASE 
    WHEN confidence_score >= 0.85 THEN 'High (≥0.85)'
    WHEN confidence_score >= 0.65 THEN 'Medium (0.65-0.85)'
    ELSE 'Low (<0.65)'
  END as confidence_level,
  COUNT(*) as count,
  AVG(confidence_score) as avg_score
FROM catalog_enrichment_suggestions
GROUP BY confidence_level
ORDER BY avg_score DESC;

-- Find items without Lensfun enrichment
SELECT id, brand, name, product_type
FROM products
WHERE product_type = 'LENS'
AND active = true
AND (specifications->>'lensfun') IS NULL;
```

### Tune Confidence Thresholds

If auto-apply creates too many errors:
1. Lower `CONFIDENCE_AUTO` from 0.85 to 0.90
2. Widen `CONFIDENCE_SUGGEST` range (e.g., 0.70-0.90)
3. Re-run enrichment with `--force`

Edit thresholds in:
- `scripts/enrich_catalog_from_lensfun.ts`
- `lib/lensfunMatchConfidence.ts` (if changing weights)

## API Reference

### `computeLensfunMatchConfidence()`

**Purpose:** Score a single catalog item against a Lensfun lens.

```typescript
import { computeLensfunMatchConfidence } from '@/lib/lensfunMatchConfidence'

const result = computeLensfunMatchConfidence(
  {
    make: "Canon",
    output_text: "Canon EF 24-105mm f/4L IS USM",
    product_type: "lens",
    specifications: {
      mount: "Canon EF",
      focal_min_mm: 24,
      focal_max_mm: 105
    }
  },
  lensfunLens // LensfunLens object
)

console.log(result.score)       // 0.92
console.log(result.reasons)     // Array of debug strings
console.log(result.breakdown)   // { makerScore, modelScore, mountScore, specScore }
```

### `findBestLensfunMatches()`

**Purpose:** Find top N matches from a candidate list.

```typescript
import { findBestLensfunMatches } from '@/lib/lensfunMatchConfidence'

const matches = findBestLensfunMatches(
  catalogItem,
  lensfunCandidates, // Array of LensfunLens
  5                  // Top N (default 5)
)

matches.forEach(m => {
  console.log(`${m.lens.model}: ${(m.match.score * 100).toFixed(1)}%`)
})
```

### `normalizeString()` and `extractKeyTokens()`

**Purpose:** Reusable string normalization for consistent matching.

```typescript
import { normalizeString, extractKeyTokens } from '@/lib/lensfunMatchConfidence'

const normalized = normalizeString("Canon EF 24-105mm f/4L IS USM")
// "canon ef 24-105mm f4 l is usm"

const tokens = extractKeyTokens(normalized)
// ["24-105mm", "f4", "l", "is", "usm", "ef"]
```

## Troubleshooting

### Import fails with "No XML files found"

**Solution:** Ensure data directory exists and files are downloaded:

```bash
mkdir -p data/lensfun
npx tsx scripts/import_lensfun.ts
```

### Enrichment produces low scores for known good matches

**Debug steps:**

1. Check match reasons:
```typescript
const match = computeLensfunMatchConfidence(catalogItem, lensfunLens)
console.log(match.reasons) // See detailed scoring breakdown
```

2. Verify normalization:
```typescript
console.log(normalizeString(catalogItem.output_text))
console.log(normalizeString(lensfunLens.model))
// Should look similar if good match
```

3. Add maker alias if needed:
```typescript
// In lib/lensfunMatchConfidence.ts
const MAKER_ALIASES: Record<string, string[]> = {
  'canon': ['canon inc', 'canon corporation'],
  // Add custom aliases here
}
```

### Auto-applied specs are incorrect

**Solution:** Reject the suggestion and adjust thresholds:

```sql
-- Mark as rejected
UPDATE catalog_enrichment_suggestions
SET status = 'REJECTED', review_notes = 'Incorrect match'
WHERE id = 'uuid-here';

-- Remove from product specs
UPDATE products
SET specifications = specifications - 'lensfun'
WHERE id = 'product-uuid';
```

Then lower `CONFIDENCE_AUTO` threshold in the enrichment script.

## Future Enhancements

Planned improvements:
- [ ] Dashboard UI for reviewing suggestions
- [ ] Bulk approve/reject interface
- [ ] Manual Lensfun lens selection (override auto-match)
- [ ] Export enriched specs to WooCommerce
- [ ] Integration with image correction workflows
- [ ] Machine learning confidence tuning

## Resources

- [Lensfun Official Site](https://lensfun.github.io/)
- [Lensfun GitHub Repo](https://github.com/lensfun/lensfun)
- [Lensfun XML Format Docs](https://lensfun.github.io/manual/v0.3.95/annotated.html)
- [String Similarity Library](https://www.npmjs.com/package/string-similarity)

## Support

For issues or questions:
- Check logs in enrichment output
- Review match reasons in `CatalogEnrichmentSuggestion` table
- Consult `lib/lensfunMatchConfidence.ts` for scoring logic
- Contact: dev@keysers.co.za
