#!/usr/bin/env tsx
/**
 * Validate catalog migration quality
 * 
 * Checks:
 * - Row count matches
 * - Pricing fields are non-null
 * - Lens required fields coverage
 * - Alias statistics
 * - Sample before/after comparison
 */

import 'dotenv/config'
import { query } from '@/lib/inventory-db'
import fs from 'fs'

async function validate() {
  console.log('🔍 Validating Catalog Migration\n')
  console.log('='.repeat(60))
  
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      stats: {},
      samples: []
    }
    
    // CHECK 1: Row count unchanged
    console.log('\n1️⃣  Checking row counts...')
    const oldCount = await query('SELECT COUNT(*) as count FROM equipment_inventory')
    const newCount = await query('SELECT COUNT(*) as count FROM catalog_items')
    
    const rowCountMatch = oldCount.rows[0].count === newCount.rows[0].count
    results.checks.rowCountMatch = rowCountMatch
    
    console.log(`   Old table: ${oldCount.rows[0].count}`)
    console.log(`   New table: ${newCount.rows[0].count}`)
    console.log(`   ${rowCountMatch ? '✅ PASS' : '❌ FAIL'}: Counts ${rowCountMatch ? 'match' : 'DO NOT match'}`)
    
    // CHECK 2: All pricing fields non-null
    console.log('\n2️⃣  Checking pricing fields...')
    const nullPricing = await query(`
      SELECT COUNT(*) as count FROM catalog_items 
      WHERE buy_low IS NULL OR buy_high IS NULL 
      OR consign_low IS NULL OR consign_high IS NULL
    `)
    
    const pricingOk = nullPricing.rows[0].count === '0'
    results.checks.pricingNonNull = pricingOk
    
    console.log(`   Rows with NULL pricing: ${nullPricing.rows[0].count}`)
    console.log(`   ${pricingOk ? '✅ PASS' : '❌ FAIL'}: All pricing fields are non-null`)
    
    // CHECK 3: Lens required fields
    console.log('\n3️⃣  Checking lens specifications...')
    const lensStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE specifications->>'mount' IS NOT NULL OR specifications->'mounts' IS NOT NULL) as has_mount,
        COUNT(*) FILTER (WHERE specifications->>'focal_min_mm' IS NOT NULL) as has_focal,
        COUNT(*) FILTER (WHERE specifications->>'aperture_min' IS NOT NULL) as has_aperture
      FROM catalog_items
      WHERE product_type ILIKE '%lens%'
    `)
    
    const ls = lensStats.rows[0]
    const mountPct = (ls.has_mount / ls.total * 100).toFixed(1)
    const focalPct = (ls.has_focal / ls.total * 100).toFixed(1)
    const aperturePct = (ls.has_aperture / ls.total * 100).toFixed(1)
    
    results.stats.lenses = {
      total: parseInt(ls.total),
      withMount: parseInt(ls.has_mount),
      withFocal: parseInt(ls.has_focal),
      withAperture: parseInt(ls.has_aperture),
      mountPct,
      focalPct,
      aperturePct
    }
    
    console.log(`   Total lenses: ${ls.total}`)
    console.log(`   With mount:   ${ls.has_mount} (${mountPct}%)`)
    console.log(`   With focal:   ${ls.has_focal} (${focalPct}%)`)
    console.log(`   With aperture: ${ls.has_aperture} (${aperturePct}%)`)
    
    // CHECK 4: Alias statistics
    console.log('\n4️⃣  Checking alias statistics...')
    const aliasStats = await query(`
      SELECT 
        COUNT(DISTINCT catalog_item_id) as items_with_aliases,
        COUNT(*) as total_aliases,
        MIN(alias_count) as min_aliases,
        ROUND(AVG(alias_count)::numeric, 1) as avg_aliases,
        MAX(alias_count) as max_aliases
      FROM (
        SELECT catalog_item_id, COUNT(*) as alias_count
        FROM catalog_ocr_aliases
        GROUP BY catalog_item_id
      ) sub
    `)
    
    const as = aliasStats.rows[0]
    results.stats.aliases = as
    
    console.log(`   Items with aliases: ${as.items_with_aliases}`)
    console.log(`   Total aliases: ${as.total_aliases}`)
    console.log(`   Min per item: ${as.min_aliases}`)
    console.log(`   Avg per item: ${as.avg_aliases}`)
    console.log(`   Max per item: ${as.max_aliases}`)
    
    const allItemsHaveAliases = parseInt(as.items_with_aliases) === parseInt(newCount.rows[0].count)
    console.log(`   ${allItemsHaveAliases ? '✅ PASS' : '⚠️  WARN'}: ${allItemsHaveAliases ? 'All' : 'Some'} items have aliases`)
    
    // CHECK 5: Sample comparison (20 random rows)
    console.log('\n5️⃣  Sampling 20 random items (before → after)...')
    const samples = await query(`
      SELECT 
        old.id as legacy_id,
        old.make as old_make,
        old.model as old_model,
        old.output_text as old_output,
        old.specifications as old_specs,
        old.ai_matching as old_ai,
        new.make as new_make,
        new.output_text as new_output,
        new.specifications as new_specs,
        (SELECT COUNT(*) FROM catalog_ocr_aliases WHERE catalog_item_id = new.id) as alias_count
      FROM equipment_inventory old
      JOIN catalog_items new ON old.id = new.legacy_id
      ORDER BY RANDOM()
      LIMIT 20
    `)
    
    results.samples = samples.rows
    
    samples.rows.forEach((s, i) => {
      console.log(`\n   Sample ${i + 1}:`)
      console.log(`   Legacy ID: ${s.legacy_id}`)
      console.log(`   Before: ${s.old_make} | ${s.old_model}`)
      console.log(`   After:  ${s.new_make} | ${s.new_output}`)
      console.log(`   Aliases: ${s.alias_count}`)
      if (i < 3) { // Show detailed specs for first 3
        console.log(`   Old specs keys: ${s.old_specs ? Object.keys(s.old_specs).join(', ') : 'none'}`)
        console.log(`   New specs keys: ${s.new_specs ? Object.keys(s.new_specs).join(', ') : 'none'}`)
      }
    })
    
    // SUMMARY
    console.log('\n' + '='.repeat(60))
    console.log('📊 VALIDATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Row count match: ${rowCountMatch ? 'PASS' : 'FAIL'}`)
    console.log(`✅ Pricing non-null: ${pricingOk ? 'PASS' : 'FAIL'}`)
    console.log(`📊 Lens specs coverage: ${mountPct}% mount, ${focalPct}% focal, ${aperturePct}% aperture`)
    console.log(`📊 Aliases: ${as.avg_aliases} avg per item`)
    console.log('='.repeat(60))
    
    // Check for missing critical specs on lenses
    const missingSpecs = await query(`
      SELECT id, make, output_text, specifications
      FROM catalog_items
      WHERE product_type ILIKE '%lens%'
      AND (
        specifications->>'mount' IS NULL OR
        specifications->>'focal_min_mm' IS NULL OR
        specifications->>'aperture_min' IS NULL
      )
      LIMIT 10
    `)
    
    if (missingSpecs.rows.length > 0) {
      console.log(`\n⚠️  ${missingSpecs.rows.length > 10 ? '10+' : missingSpecs.rows.length} lenses with incomplete specs (candidates for Lensfun enrichment):`)
      missingSpecs.rows.forEach(r => {
        const missing = []
        if (!r.specifications.mount) missing.push('mount')
        if (!r.specifications.focal_min_mm) missing.push('focal')
        if (!r.specifications.aperture_min) missing.push('aperture')
        console.log(`   ${r.make} ${r.output_text} - missing: ${missing.join(', ')}`)
      })
    }
    
    // Save report
    fs.mkdirSync('reports', { recursive: true })
    fs.writeFileSync('reports/validation-report.json', JSON.stringify(results, null, 2))
    
    console.log('\n✅ Detailed validation report saved to: reports/validation-report.json')
    
  } catch (error: any) {
    console.error('\n❌ Validation error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

validate()
  .then(() => {
    console.log('\n✅ Validation complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
