#!/usr/bin/env tsx
/**
 * Catalog Enrichment from Lensfun
 * 
 * Matches catalog lens items with Lensfun database entries and enriches
 * specifications using the canonical confidence scoring function.
 * 
 * IMPORTANT: This script works with:
 * - catalog_items table in keysers_inventory database (catalog data)
 * - catalog_enrichment_suggestions table in keysers_inventory (audit trail)
 * - lensfun_lenses table in keysers_dashboard database (Lensfun mirror)
 * 
 * Usage:
 *   npx tsx scripts/enrich_catalog_from_lensfun.ts [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run  Show what would be enriched without making changes
 *   --force    Re-process items that already have COMPLETE specs (focal + aperture)
 * 
 * Safety Rules:
 * - Lenses with BOTH focal_min_mm AND aperture_min are considered COMPLETE
 * - Complete lenses are SKIPPED unless --force is used
 * - Only NULL fields are promoted from Lensfun (never overwrites existing data)
 * - specifications.lensfun audit block is always written for traceability
 * 
 * Confidence thresholds:
 *   >= 0.85  Auto-fill specs (mark as AUTO_APPLIED)
 *   0.65-0.85  Create suggestion for review (mark as PENDING_REVIEW)
 *   < 0.65   Skip (no match)
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { query } from '@/lib/inventory-db'
import {
  computeLensfunMatchConfidence,
  findBestLensfunMatches,
  getConfidenceLevel,
  type CatalogItem,
  type LensfunLens
} from '@/lib/lensfunMatchConfidence'

const CONFIDENCE_AUTO = 0.85
const CONFIDENCE_SUGGEST = 0.65

interface EnrichmentStats {
  total: number
  complete: number // Skipped due to having complete specs
  skipped: number // Skipped for other reasons (already enriched, no match, etc.)
  autoApplied: number
  suggested: number
  noMatch: number
  errors: number
}

interface EnrichmentResult {
  action: 'auto' | 'suggest' | 'skip_complete' | 'skip' | 'error'
  score?: number
  reasons?: string[]
}

/**
 * Check if a catalog item has COMPLETE specs
 * Complete = BOTH focal_min_mm AND aperture_min are populated
 */
function isComplete(specs: any): boolean {
  return !!(
    specs &&
    specs.focal_min_mm !== null &&
    specs.focal_min_mm !== undefined &&
    specs.aperture_min !== null &&
    specs.aperture_min !== undefined
  )
}

/**
 * Check if a catalog item already has Lensfun enrichment
 */
function hasLensfunEnrichment(specs: any): boolean {
  return !!(specs && specs.lensfun && specs.lensfun.match_score)
}

/**
 * Enrich a single catalog item
 */
async function enrichCatalogItem(
  catalogRow: any,
  lensfunCandidates: LensfunLens[],
  dryRun: boolean,
  force: boolean
): Promise<EnrichmentResult> {
  try {
    // Skip if not a lens
    if (!catalogRow.product_type || !catalogRow.product_type.toLowerCase().includes('lens')) {
      return { action: 'skip' }
    }
    
    // Parse specifications JSONB
    const specs = catalogRow.specifications || {}
    
    // SAFETY CHECK: Skip if COMPLETE (unless --force)
    if (!force && isComplete(specs)) {
      return { action: 'skip_complete' }
    }
    
    // Build catalog item for matching
    const catalogItem: CatalogItem = {
      make: catalogRow.make,
      output_text: catalogRow.output_text,
      product_type: catalogRow.product_type.toLowerCase(),
      specifications: specs
    }
    
    // Find best matches
    const matches = findBestLensfunMatches(catalogItem, lensfunCandidates, 5)
    
    if (matches.length === 0) {
      console.log(`  ⚠️  No matches found for: ${catalogRow.make} ${catalogRow.output_text}`)
      return { action: 'skip' }
    }
    
    const best = matches[0]
    const { level, action } = getConfidenceLevel(best.match.score)
    
    console.log(`  📊 ${catalogRow.make} ${catalogRow.output_text}`)
    console.log(`     Best match: ${best.lens.maker} ${best.lens.model}`)
    console.log(`     Score: ${(best.match.score * 100).toFixed(1)}% (${level})`)
    console.log(`     Action: ${action}`)
    console.log(`     Reasons: ${best.match.reasons.slice(0, 3).join(', ')}`)
    
    if (action === 'skip') {
      return { action: 'skip', score: best.match.score, reasons: best.match.reasons }
    }
    
    if (dryRun) {
      console.log(`     [DRY RUN] Would ${action === 'auto' ? 'auto-apply' : 'create suggestion'}`)
      return { action, score: best.match.score, reasons: best.match.reasons }
    }
    
    // Prepare Lensfun enrichment data (audit block)
    const lensfunData = {
      match_score: best.match.score,
      lensfun_lens_id: best.lens.id,
      maker: best.lens.maker,
      model: best.lens.model,
      mounts: best.lens.mounts,
      focal_min_mm: best.lens.focalMin,
      focal_max_mm: best.lens.focalMax,
      aperture_min: best.lens.apertureMin,
      aperture_max: best.lens.apertureMax,
      reasons: best.match.reasons,
      enriched_at: new Date().toISOString()
    }
    
    // Create immutable BEFORE snapshot
    const specsBefore = JSON.parse(JSON.stringify(specs))
    
    if (action === 'auto') {
      // Auto-apply: merge into specifications
      const updatedSpecs = {
        ...specs,
        lensfun: lensfunData,
        source: specs.source || 'lensfun',
        confidence: best.match.score
      }
      
      // SAFETY: Only promote to top-level if MISSING (NULL/undefined)
      // Never overwrite existing values
      if (!specs.mount && lensfunData.mounts && lensfunData.mounts.length > 0) {
        updatedSpecs.mount = lensfunData.mounts[0]
        updatedSpecs.mounts = lensfunData.mounts
      }
      
      // Only promote focal fields if focal_min_mm is NULL
      if (!specs.focal_min_mm && lensfunData.focal_min_mm !== null) {
        updatedSpecs.focal_min_mm = lensfunData.focal_min_mm
      }
      if (!specs.focal_max_mm && lensfunData.focal_max_mm !== null) {
        updatedSpecs.focal_max_mm = lensfunData.focal_max_mm
      }
      
      // Only promote aperture fields if aperture_min is NULL
      if (!specs.aperture_min && lensfunData.aperture_min !== null) {
        updatedSpecs.aperture_min = lensfunData.aperture_min
      }
      if (!specs.aperture_max && lensfunData.aperture_max !== null) {
        updatedSpecs.aperture_max = lensfunData.aperture_max
      }
      
      // Update catalog_items table (keysers_inventory)
      await query(`
        UPDATE catalog_items
        SET specifications = $1, updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(updatedSpecs), catalogRow.id])
      
      // Create immutable audit record in keysers_inventory
      await query(`
        INSERT INTO catalog_enrichment_suggestions (
          catalog_item_id,
          lensfun_lens_id,
          lensfun_maker,
          lensfun_model,
          confidence_score,
          match_reasons,
          catalog_output_text,
          catalog_make,
          specs_before,
          specs_after,
          suggested_specs,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (catalog_item_id, lensfun_lens_id) DO UPDATE SET
          confidence_score = EXCLUDED.confidence_score,
          match_reasons = EXCLUDED.match_reasons,
          specs_after = EXCLUDED.specs_after,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [
        catalogRow.id,
        best.lens.id,
        best.lens.maker,
        best.lens.model,
        best.match.score,
        best.match.reasons,
        catalogRow.output_text,
        catalogRow.make,
        JSON.stringify(specsBefore),
        JSON.stringify(updatedSpecs),
        JSON.stringify(lensfunData),
        'AUTO_APPLIED'
      ])
      
      console.log(`     ✅ Auto-applied specs`)
      return { action: 'auto', score: best.match.score, reasons: best.match.reasons }
      
    } else if (action === 'suggest') {
      // Create suggestion for review (no changes to catalog_items)
      // Enforce: at most ONE PENDING_REVIEW per catalog_item_id
      
      // Check if a PENDING_REVIEW already exists for this catalog_item
      const existingRes = await query(
        `
SELECT id, confidence_score
FROM catalog_enrichment_suggestions
WHERE catalog_item_id = $1
  AND status = 'PENDING_REVIEW'
LIMIT 1;
        `,
        [catalogRow.id]
      )
      
      const existing = existingRes.rows[0]
      const newScore = best.match.score
      
      if (existing) {
        const existingScore = Number(existing.confidence_score)
        
        if (newScore > existingScore) {
          // Supersede the existing and insert new as PENDING_REVIEW
          await query(
            `
UPDATE catalog_enrichment_suggestions
SET
  status = 'SUPERSEDED',
  superseded_at = NOW(),
  superseded_by_id = NULL,
  review_note = COALESCE(review_note || E'\n\n', '') || $2,
  updated_at = NOW()
WHERE id = $1;
            `,
            [
              existing.id,
              `Superseded by higher confidence match (new score ${newScore.toFixed(3)} > old ${existingScore.toFixed(3)})`,
            ]
          )
          
          // Now insert new as PENDING_REVIEW (unique index will pass since old is now SUPERSEDED)
          await query(
            `
INSERT INTO catalog_enrichment_suggestions (
  catalog_item_id,
  lensfun_lens_id,
  lensfun_maker,
  lensfun_model,
  confidence_score,
  match_reasons,
  catalog_output_text,
  catalog_make,
  specs_before,
  suggested_specs,
  status
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
            `,
            [
              catalogRow.id,
              best.lens.id,
              best.lens.maker,
              best.lens.model,
              best.match.score,
              best.match.reasons,
              catalogRow.output_text,
              catalogRow.make,
              JSON.stringify(specsBefore),
              JSON.stringify(lensfunData),
              'PENDING_REVIEW',
            ]
          )
          
          console.log(`     📝 Created suggestion (superseded existing lower-confidence match)`)
        } else {
          // New score <= existing, insert new as SUPERSEDED immediately
          await query(
            `
INSERT INTO catalog_enrichment_suggestions (
  catalog_item_id,
  lensfun_lens_id,
  lensfun_maker,
  lensfun_model,
  confidence_score,
  match_reasons,
  catalog_output_text,
  catalog_make,
  specs_before,
  suggested_specs,
  status,
  superseded_at,
  review_note
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12);
            `,
            [
              catalogRow.id,
              best.lens.id,
              best.lens.maker,
              best.lens.model,
              best.match.score,
              best.match.reasons,
              catalogRow.output_text,
              catalogRow.make,
              JSON.stringify(specsBefore),
              JSON.stringify(lensfunData),
              'SUPERSEDED',
              `Not kept: lower confidence (${newScore.toFixed(3)}) than existing pending review (${existingScore.toFixed(3)})`,
            ]
          )
          
          console.log(`     ⏭️  Skipped (lower confidence than existing pending review)`)
        }
      } else {
        // No existing PENDING_REVIEW, insert new
        await query(
          `
INSERT INTO catalog_enrichment_suggestions (
  catalog_item_id,
  lensfun_lens_id,
  lensfun_maker,
  lensfun_model,
  confidence_score,
  match_reasons,
  catalog_output_text,
  catalog_make,
  specs_before,
  suggested_specs,
  status
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
          `,
          [
            catalogRow.id,
            best.lens.id,
            best.lens.maker,
            best.lens.model,
            best.match.score,
            best.match.reasons,
            catalogRow.output_text,
            catalogRow.make,
            JSON.stringify(specsBefore),
            JSON.stringify(lensfunData),
            'PENDING_REVIEW',
          ]
        )
        
        console.log(`     📝 Created suggestion for review`)
      }
      
      return { action: 'suggest', score: best.match.score, reasons: best.match.reasons }
    }
    
    return { action: 'skip' }
    
  } catch (error: any) {
    console.error(`  ❌ Error enriching ${catalogRow.make} ${catalogRow.output_text}: ${error.message}`)
    return { action: 'error' }
  }
}

/**
 * Main enrichment function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  
  console.log('🔧 Catalog Enrichment from Lensfun\n')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Force re-process: ${force ? 'YES' : 'NO'}`)
  console.log(`Confidence thresholds: auto >= ${CONFIDENCE_AUTO}, suggest >= ${CONFIDENCE_SUGGEST}\n`)
  
  try {
    // Step 1: Load all Lensfun lenses
    console.log('📥 Loading Lensfun database...')
    const latestRun = await prisma.lensfunImportRun.findFirst({
      orderBy: { startedAt: 'desc' }
    })

    if (!latestRun) {
      console.error('❌ No Lensfun import runs found.')
      console.error('   Run: npx tsx scripts/import_lensfun.ts --offline')
      process.exit(1)
    }

    console.log(`🧾 Using latest Lensfun import run: ${latestRun.id}`)
    const lensfunLenses = await prisma.lensfunLens.findMany({
      where: { importRunId: latestRun.id }
    })
    
    if (lensfunLenses.length === 0) {
      console.error('❌ No Lensfun lenses found in database.')
      console.error('   Run: npx tsx scripts/import_lensfun.ts')
      process.exit(1)
    }
    
    console.log(`✅ Loaded ${lensfunLenses.length} Lensfun lenses\n`)
    
    // Step 2: Load all catalog lens items from keysers_inventory
    console.log('📥 Loading catalog lens items from keysers_inventory...')
    const catalogItems = await query(`
      SELECT 
        id, make, product_type, output_text, is_active,
        specifications, legacy_id
      FROM catalog_items
      WHERE product_type ILIKE '%lens%'
      AND is_active = true
    `)
    
    const products = catalogItems.rows
    
    console.log(`✅ Found ${products.length} active lens products\n`)
    
    if (products.length === 0) {
      console.log('ℹ️  No lens products to enrich.')
      process.exit(0)
    }
    
    // Step 3: Group Lensfun lenses by maker for efficient lookup
    console.log('🗂️  Indexing Lensfun lenses by maker...')
    const lensfunByMaker = new Map<string, LensfunLens[]>()
    
    for (const lens of lensfunLenses) {
      const makerKey = lens.maker.toLowerCase()
      if (!lensfunByMaker.has(makerKey)) {
        lensfunByMaker.set(makerKey, [])
      }
      lensfunByMaker.get(makerKey)!.push(lens)
    }
    
    console.log(`✅ Indexed ${lensfunByMaker.size} unique makers\n`)
    
    // Step 4: Enrich each catalog item
    console.log('🔄 Enriching catalog items...\n')
    
    const stats: EnrichmentStats = {
      total: products.length,
      complete: 0,
      skipped: 0,
      autoApplied: 0,
      suggested: 0,
      noMatch: 0,
      errors: 0
    }
    
    const autoAppliedDetails: Array<{
      make: string
      output_text: string
      score: number
      reasons: string[]
    }> = []
    
    for (const catalogRow of products) {
      const makerKey = catalogRow.make.toLowerCase()
      const candidates = lensfunByMaker.get(makerKey) || []
      
      if (candidates.length === 0) {
        console.log(`  ⚠️  No Lensfun candidates for maker: ${catalogRow.make}`)
        stats.noMatch++
        continue
      }
      
      const result = await enrichCatalogItem(catalogRow, candidates, dryRun, force)
      
      switch (result.action) {
        case 'auto':
          stats.autoApplied++
          if (result.score && result.reasons) {
            autoAppliedDetails.push({
              make: catalogRow.make,
              output_text: catalogRow.output_text,
              score: result.score,
              reasons: result.reasons
            })
          }
          break
        case 'suggest':
          stats.suggested++
          break
        case 'skip_complete':
          stats.complete++
          break
        case 'skip':
          stats.skipped++
          break
        case 'error':
          stats.errors++
          break
      }
    }
    
    // Step 5: Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 ENRICHMENT SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total lens products:        ${stats.total}`)
    console.log(`  ✅ Auto-applied:          ${stats.autoApplied}`)
    console.log(`  📝 Suggested for review:  ${stats.suggested}`)
    console.log(`  ⏭️  Skipped (complete):    ${stats.complete}`)
    console.log(`  ⏭️  Skipped (other):       ${stats.skipped}`)
    console.log(`  ⚠️  No match:              ${stats.noMatch}`)
    console.log(`  ❌ Errors:                ${stats.errors}`)
    console.log('='.repeat(60))
    
    // Show lowest 20 auto-applies with scores
    if (autoAppliedDetails.length > 0) {
      console.log('\n📉 LOWEST 20 AUTO-APPLIED MATCHES (by confidence score):')
      console.log('='.repeat(60))
      
      const sortedByScore = [...autoAppliedDetails].sort((a, b) => a.score - b.score)
      const lowest20 = sortedByScore.slice(0, 20)
      
      lowest20.forEach((item, idx) => {
        console.log(`\n${idx + 1}. ${item.make} ${item.output_text}`)
        console.log(`   Score: ${(item.score * 100).toFixed(1)}%`)
        console.log(`   Reasons: ${item.reasons.slice(0, 3).join(', ')}`)
      })
    }
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made')
      console.log('   Run without --dry-run to apply changes')
    } else {
      console.log(`\n✅ Enrichment complete! ${stats.autoApplied + stats.suggested} records processed.`)
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
