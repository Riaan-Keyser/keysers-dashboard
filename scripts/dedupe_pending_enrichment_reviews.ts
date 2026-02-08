#!/usr/bin/env tsx
/**
 * Dedupe Pending Enrichment Reviews (Category B hygiene)
 * 
 * One-time cleanup script to ensure at most ONE PENDING_REVIEW per catalog_item_id.
 * 
 * Behavior:
 * - For each catalog_item_id with multiple PENDING_REVIEW rows:
 *   - Sort by confidence_score DESC, then updated_at DESC
 *   - Keep the top row as PENDING_REVIEW
 *   - Mark others as SUPERSEDED
 * 
 * Usage:
 *   npx tsx scripts/dedupe_pending_enrichment_reviews.ts
 */

import "dotenv/config"
import { query } from "@/lib/inventory-db"

async function main() {
  console.log("🔧 Dedupe Pending Enrichment Reviews\n")

  // Step 1: Find items with duplicate PENDING_REVIEW
  const dupesRes = await query(
    `
SELECT catalog_item_id, COUNT(*)::int AS pending_count
FROM catalog_enrichment_suggestions
WHERE status = 'PENDING_REVIEW'
GROUP BY catalog_item_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
    `
  )

  const dupes = dupesRes.rows
  console.log(`Found ${dupes.length} catalog items with duplicate PENDING_REVIEW rows\n`)

  if (dupes.length === 0) {
    console.log("✅ No duplicates found. Nothing to do.")
    return
  }

  let totalKept = 0
  let totalSuperseded = 0
  const examples: any[] = []

  // Step 2: For each duplicate item, keep the best and supersede others
  for (const dupe of dupes) {
    const { catalog_item_id, pending_count } = dupe

    // Fetch all PENDING_REVIEW for this item, sorted by score desc, then updated_at desc
    const rowsRes = await query(
      `
SELECT
  s.id,
  s.catalog_item_id,
  s.confidence_score,
  s.created_at,
  s.updated_at,
  ci.make,
  ci.output_text
FROM catalog_enrichment_suggestions s
JOIN catalog_items ci ON ci.id = s.catalog_item_id
WHERE s.catalog_item_id = $1
  AND s.status = 'PENDING_REVIEW'
ORDER BY s.confidence_score DESC NULLS LAST, s.updated_at DESC, s.created_at DESC
FOR UPDATE OF s;
      `,
      [catalog_item_id]
    )

    const rows = rowsRes.rows
    if (rows.length <= 1) continue

    const kept = rows[0]
    const superseded = rows.slice(1)

    totalKept += 1
    totalSuperseded += superseded.length

    if (examples.length < 10) {
      examples.push({
        catalog_item_id,
        make: kept.make,
        output_text: kept.output_text,
        pending_count,
        kept_id: kept.id,
        kept_score: kept.confidence_score,
        superseded_ids: superseded.map((s) => s.id),
      })
    }

    // Mark superseded rows
    for (const s of superseded) {
      await query(
        `
UPDATE catalog_enrichment_suggestions
SET
  status = 'SUPERSEDED',
  superseded_at = NOW(),
  superseded_by_id = $2,
  review_note = COALESCE(
    review_note || E'\n\n',
    ''
  ) || $3,
  updated_at = NOW()
WHERE id = $1;
        `,
        [
          s.id,
          kept.id,
          `Superseded by higher confidence pending match (kept ${kept.id}, score ${kept.confidence_score})`,
        ]
      )
    }
  }

  console.log("=== DEDUPE SUMMARY ===")
  console.log(`Items deduped: ${dupes.length}`)
  console.log(`Rows kept as PENDING_REVIEW: ${totalKept}`)
  console.log(`Rows marked SUPERSEDED: ${totalSuperseded}`)

  console.log("\n=== TOP 10 EXAMPLES ===")
  for (const ex of examples) {
    console.log(JSON.stringify(ex))
  }

  // Verify no duplicates remain
  const verifyRes = await query(
    `
SELECT catalog_item_id, COUNT(*)::int AS pending_count
FROM catalog_enrichment_suggestions
WHERE status = 'PENDING_REVIEW'
GROUP BY catalog_item_id
HAVING COUNT(*) > 1;
    `
  )

  if (verifyRes.rows.length > 0) {
    console.error(`\n❌ ERROR: ${verifyRes.rows.length} items still have duplicate PENDING_REVIEW rows!`)
    process.exit(1)
  }

  console.log("\n✅ Dedupe complete. No duplicates remain.")
  console.log("\nNext: Create partial unique index to prevent future duplicates:")
  console.log(`
PGPASSWORD=keysers_secure_db_2024 psql -h localhost -U keysers -d keysers_inventory -c "
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_enrichment_one_pending_per_item
  ON catalog_enrichment_suggestions(catalog_item_id)
  WHERE status = 'PENDING_REVIEW';
"
  `)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
