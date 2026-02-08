#!/usr/bin/env tsx
/**
 * Catalog Enrichment from Lensfun
 * 
 * Matches catalog lens items with Lensfun database entries and enriches
 * specifications using the canonical confidence scoring function.
 * 
 * Usage:
 *   npx tsx scripts/enrich_catalog_from_lensfun.ts [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run  Show what would be enriched without making changes
 *   --force    Re-process items that already have lensfun enrichment
 * 
 * Confidence thresholds:
 *   >= 0.85  Auto-fill specs (mark as AUTO_APPLIED)
 *   0.65-0.85  Create suggestion for review (mark as PENDING_REVIEW)
 *   < 0.65   Skip (no match)
 */

import { prisma } from '@/lib/prisma'
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
  skipped: number
  autoApplied: number
  suggested: number
  noMatch: number
  errors: number
}

/**
 * Check if a product already has Lensfun enrichment
 */
function hasLensfunEnrichment(specs: any): boolean {
  return !!(specs && specs.lensfun && specs.lensfun.match_score)
}

/**
 * Enrich a single catalog item
 */
async function enrichCatalogItem(
  product: any,
  lensfunCandidates: LensfunLens[],
  dryRun: boolean,
  force: boolean
): Promise<'auto' | 'suggest' | 'skip' | 'error'> {
  try {
    // Skip if not a lens
    if (product.productType !== 'LENS') {
      return 'skip'
    }
    
    // Skip if already enriched (unless force)
    const specs = product.specifications || {}
    if (!force && hasLensfunEnrichment(specs)) {
      return 'skip'
    }
    
    // Build catalog item for matching
    const catalogItem: CatalogItem = {
      make: product.brand,
      output_text: product.name,
      product_type: product.productType.toLowerCase(),
      specifications: specs
    }
    
    // Find best matches
    const matches = findBestLensfunMatches(catalogItem, lensfunCandidates, 5)
    
    if (matches.length === 0) {
      console.log(`  ⚠️  No matches found for: ${product.brand} ${product.name}`)
      return 'skip'
    }
    
    const best = matches[0]
    const { level, action } = getConfidenceLevel(best.match.score)
    
    console.log(`  📊 ${product.brand} ${product.name}`)
    console.log(`     Best match: ${best.lens.maker} ${best.lens.model}`)
    console.log(`     Score: ${(best.match.score * 100).toFixed(1)}% (${level})`)
    console.log(`     Action: ${action}`)
    
    if (action === 'skip') {
      return 'skip'
    }
    
    if (dryRun) {
      console.log(`     [DRY RUN] Would ${action === 'auto' ? 'auto-apply' : 'create suggestion'}`)
      return action
    }
    
    // Prepare Lensfun enrichment data
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
    
    if (action === 'auto') {
      // Auto-apply: merge into specifications
      const updatedSpecs = {
        ...specs,
        lensfun: lensfunData,
        source: specs.source || 'lensfun',
        confidence: best.match.score
      }
      
      // Promote to top-level if missing
      if (!specs.mount && lensfunData.mounts.length > 0) {
        updatedSpecs.mount = lensfunData.mounts[0]
        updatedSpecs.mounts = lensfunData.mounts
      }
      if (!specs.focal_min_mm && lensfunData.focal_min_mm) {
        updatedSpecs.focal_min_mm = lensfunData.focal_min_mm
      }
      if (!specs.focal_max_mm && lensfunData.focal_max_mm) {
        updatedSpecs.focal_max_mm = lensfunData.focal_max_mm
      }
      if (!specs.aperture_min && lensfunData.aperture_min) {
        updatedSpecs.aperture_min = lensfunData.aperture_min
      }
      if (!specs.aperture_max && lensfunData.aperture_max) {
        updatedSpecs.aperture_max = lensfunData.aperture_max
      }
      
      // Update product
      await prisma.product.update({
        where: { id: product.id },
        data: {
          specifications: JSON.stringify(updatedSpecs)
        }
      })
      
      // Create enrichment record as AUTO_APPLIED
      await prisma.catalogEnrichmentSuggestion.create({
        data: {
          productId: product.id,
          lensfunLensId: best.lens.id,
          confidenceScore: best.match.score,
          matchReasons: best.match.reasons,
          suggestedSpecs: lensfunData,
          status: 'AUTO_APPLIED'
        }
      })
      
      console.log(`     ✅ Auto-applied specs`)
      return 'auto'
      
    } else if (action === 'suggest') {
      // Create suggestion for review
      await prisma.catalogEnrichmentSuggestion.create({
        data: {
          productId: product.id,
          lensfunLensId: best.lens.id,
          confidenceScore: best.match.score,
          matchReasons: best.match.reasons,
          suggestedSpecs: lensfunData,
          status: 'PENDING_REVIEW'
        }
      })
      
      console.log(`     📝 Created suggestion for review`)
      return 'suggest'
    }
    
    return 'skip'
    
  } catch (error: any) {
    console.error(`  ❌ Error enriching ${product.brand} ${product.name}: ${error.message}`)
    return 'error'
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
    const lensfunLenses = await prisma.lensfunLens.findMany()
    
    if (lensfunLenses.length === 0) {
      console.error('❌ No Lensfun lenses found in database.')
      console.error('   Run: npx tsx scripts/import_lensfun.ts')
      process.exit(1)
    }
    
    console.log(`✅ Loaded ${lensfunLenses.length} Lensfun lenses\n`)
    
    // Step 2: Load all catalog lens products
    console.log('📥 Loading catalog lens items...')
    const products = await prisma.product.findMany({
      where: {
        productType: 'LENS',
        active: true
      }
    })
    
    console.log(`✅ Found ${products.length} active lens products\n`)
    
    if (products.length === 0) {
      console.log('ℹ️  No lens products to enrich.')
      process.exit(0)
    }
    
    // Step 3: Group Lensfun lenses by maker for efficient lookup
    console.log('🗂️  Indexing Lensfun lenses by maker...')
    const lensfunByMaker = new Map<string, LensfunLens[]>()
    
    for (const lens of lensfunLenses) {
      const makerKey = lens.makerNormalized.toLowerCase()
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
      skipped: 0,
      autoApplied: 0,
      suggested: 0,
      noMatch: 0,
      errors: 0
    }
    
    for (const product of products) {
      const makerKey = product.brand.toLowerCase()
      const candidates = lensfunByMaker.get(makerKey) || []
      
      if (candidates.length === 0) {
        console.log(`  ⚠️  No Lensfun candidates for maker: ${product.brand}`)
        stats.noMatch++
        continue
      }
      
      const result = await enrichCatalogItem(product, candidates, dryRun, force)
      
      switch (result) {
        case 'auto':
          stats.autoApplied++
          break
        case 'suggest':
          stats.suggested++
          break
        case 'skip':
          stats.skipped++
          break
        case 'error':
          stats.errors++
          break
      }
    }
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Enrichment Summary')
    console.log('='.repeat(60))
    console.log(`Total items:           ${stats.total}`)
    console.log(`Auto-applied (≥0.85):  ${stats.autoApplied}`)
    console.log(`Suggested (0.65-0.85): ${stats.suggested}`)
    console.log(`No match (<0.65):      ${stats.noMatch}`)
    console.log(`Skipped (existing):    ${stats.skipped}`)
    console.log(`Errors:                ${stats.errors}`)
    console.log('='.repeat(60))
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made')
      console.log('   Run without --dry-run to apply changes')
    } else {
      console.log('\n✅ Enrichment complete!')
      
      if (stats.suggested > 0) {
        console.log(`\nℹ️  ${stats.suggested} suggestions await review in the dashboard.`)
      }
    }
    
  } catch (error: any) {
    console.error('❌ Enrichment failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
