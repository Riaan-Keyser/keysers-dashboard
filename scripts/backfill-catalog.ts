#!/usr/bin/env tsx
/**
 * Backfill catalog data from equipment_inventory to catalog_items
 * 
 * This script:
 * 1. Reads all equipment_inventory rows
 * 2. Standardizes specifications (merges flat + JSONB)
 * 3. Normalizes aliases from ai_matching
 * 4. Inserts into catalog_items and catalog_ocr_aliases
 * 
 * ZERO DATA LOSS: Original table preserved
 */

import 'dotenv/config'
import { query } from '@/lib/inventory-db'

interface LegacyRow {
  id: number
  make: string | null
  model: string | null
  product_type: string | null
  specifications: any
  ai_matching: any
  pricing: any
  full_name: string | null
  output_text: string | null
  focal_length: string | null
  aperture: string | null
  mount: string | null
  price_low: number | null
  price_high: number | null
  consignment_price_low: number | null
  consignment_price_high: number | null
  is_active: boolean | null
  notes: string | null
  [key: string]: any
}

// Normalize string for alias matching
function normalizeAlias(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/f\s*\/\s*/gi, 'f')
    .replace(/f\s*(\d)/gi, 'f$1')
    .replace(/(\d+)\s*mm/gi, '$1mm')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1-$2')
    .replace(/[^\w\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Parse focal length string to min/max
function parseFocalLength(focal: string): { min?: number; max?: number } {
  if (!focal) return {}
  
  // Remove mm and normalize
  const clean = focal.toLowerCase().replace(/mm/g, '').trim()
  
  // Check for range (e.g., "24-105", "70-200")
  const rangeMatch = clean.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    }
  }
  
  // Single value (prime lens)
  const singleMatch = clean.match(/(\d+(?:\.\d+)?)/)
  if (singleMatch) {
    const val = parseFloat(singleMatch[1])
    return { min: val }
  }
  
  return {}
}

// Parse aperture string to min/max
function parseAperture(aperture: string): { min?: number; max?: number } {
  if (!aperture) return {}
  
  // Remove f/ and normalize
  const clean = aperture.toLowerCase().replace(/f\/?/g, '').trim()
  
  // Check for range (e.g., "2.8-4", "3.3-4.5")
  const rangeMatch = clean.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    }
  }
  
  // Single value
  const singleMatch = clean.match(/(\d+(?:\.\d+)?)/)
  if (singleMatch) {
    const val = parseFloat(singleMatch[1])
    return { min: val }
  }
  
  return {}
}

// Standardize specifications
function standardizeSpecifications(row: LegacyRow): any {
  const specs: any = {
    source: 'import',
    confidence: 0.7,
    import_date: new Date().toISOString()
  }
  
  // Merge existing JSONB specs
  if (row.specifications && typeof row.specifications === 'object') {
    Object.assign(specs, row.specifications)
  }
  
  // Add/override from flat columns (flat columns take precedence)
  if (row.mount) {
    specs.mount = row.mount
  }
  
  if (row.focal_length) {
    const focal = parseFocalLength(row.focal_length)
    if (focal.min) specs.focal_min_mm = focal.min
    if (focal.max) specs.focal_max_mm = focal.max
  }
  
  if (row.aperture) {
    const aperture = parseAperture(row.aperture)
    if (aperture.min) specs.aperture_min = aperture.min
    if (aperture.max) specs.aperture_max = aperture.max
  }
  
  // Clean up null/empty values
  Object.keys(specs).forEach(key => {
    if (specs[key] === null || specs[key] === '' || specs[key] === undefined) {
      delete specs[key]
    }
  })
  
  return specs
}

// Extract aliases from ai_matching and other sources
function extractAliases(row: LegacyRow): Array<{ text: string; priority: number; source: string }> {
  const aliasSet = new Set<string>()
  const aliases: Array<{ text: string; priority: number; source: string }> = []
  
  // From ai_matching.aliases
  if (row.ai_matching?.aliases && Array.isArray(row.ai_matching.aliases)) {
    row.ai_matching.aliases.forEach((a: string) => {
      const normalized = normalizeAlias(a)
      if (normalized && !aliasSet.has(normalized)) {
        aliasSet.add(normalized)
        aliases.push({ text: normalized, priority: 2, source: 'import' })
      }
    })
  }
  
  // From ai_matching.vision_ocr
  if (row.ai_matching?.vision_ocr) {
    const normalized = normalizeAlias(row.ai_matching.vision_ocr)
    if (normalized && !aliasSet.has(normalized)) {
      aliasSet.add(normalized)
      aliases.push({ text: normalized, priority: 2, source: 'ocr' })
    }
  }
  
  // From output_text (highest priority)
  if (row.output_text) {
    const normalized = normalizeAlias(row.output_text)
    if (normalized && !aliasSet.has(normalized)) {
      aliasSet.add(normalized)
      aliases.push({ text: normalized, priority: 1, source: 'manual' })
    }
  }
  
  // From full_name
  if (row.full_name && row.full_name !== row.output_text) {
    const normalized = normalizeAlias(row.full_name)
    if (normalized && !aliasSet.has(normalized)) {
      aliasSet.add(normalized)
      aliases.push({ text: normalized, priority: 2, source: 'import' })
    }
  }
  
  // From model
  if (row.model) {
    const normalized = normalizeAlias(row.model)
    if (normalized && !aliasSet.has(normalized)) {
      aliasSet.add(normalized)
      aliases.push({ text: normalized, priority: 3, source: 'generated' })
    }
  }
  
  // Generate from make + model if we have both
  if (row.make && row.model) {
    const combined = normalizeAlias(`${row.make} ${row.model}`)
    if (combined && !aliasSet.has(combined)) {
      aliasSet.add(combined)
      aliases.push({ text: combined, priority: 2, source: 'generated' })
    }
  }
  
  return aliases.length > 0 ? aliases : [
    { text: normalizeAlias(row.output_text || row.full_name || row.model || 'unknown'), priority: 1, source: 'fallback' }
  ]
}

async function backfill() {
  console.log('🔄 Starting catalog backfill...\n')
  
  try {
    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM equipment_inventory')
    const total = parseInt(countResult.rows[0].total)
    
    console.log(`📊 Found ${total} rows in equipment_inventory\n`)
    
    // Fetch all rows
    console.log('📥 Loading all rows...')
    const rows = await query('SELECT * FROM equipment_inventory ORDER BY id')
    
    let processed = 0
    let errors: any[] = []
    let warnings: any[] = []
    
    console.log('✨ Processing and inserting...\n')
    
    for (const row of rows.rows) {
      try {
        // Prepare standardized data
        const make = row.make || 'Unknown'
        const productType = row.product_type || 'Other'
        const outputText = row.output_text || row.full_name || row.model || `${make} Product`
        const isActive = row.is_active !== false
        
        const specs = standardizeSpecifications(row)
        const aliases = extractAliases(row)
        
        // Prepare pricing with constraint safety
        const buyLow = row.price_low || 0
        const buyHigh = row.price_high || buyLow
        const consignLow = row.consignment_price_low || 0
        const consignHigh = row.consignment_price_high !== null ? row.consignment_price_high : consignLow
        
        // Insert into catalog_items
        const insertResult = await query(`
          INSERT INTO catalog_items (
            make, product_type, output_text, is_active,
            buy_low, buy_high, consign_low, consign_high,
            specifications, legacy_id, legacy_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          make,
          productType,
          outputText,
          isActive,
          buyLow,
          Math.max(buyHigh, buyLow),
          consignLow,
          Math.max(consignHigh, consignLow),
          JSON.stringify(specs),
          row.id,
          JSON.stringify(row)
        ])
        
        const catalogItemId = insertResult.rows[0].id
        
        // Insert aliases
        for (const alias of aliases) {
          try {
            await query(`
              INSERT INTO catalog_ocr_aliases (
                catalog_item_id, alias_text, priority, source
              ) VALUES ($1, $2, $3, $4)
              ON CONFLICT (catalog_item_id, alias_text) DO NOTHING
            `, [catalogItemId, alias.text, alias.priority, alias.source])
          } catch (aliasError: any) {
            // Log but don't fail on alias insert errors
            warnings.push({ row: row.id, alias: alias.text, error: aliasError.message })
          }
        }
        
        processed++
        
        if (processed % 100 === 0) {
          console.log(`  ✅ Processed ${processed}/${total} (${Math.round(processed/total*100)}%)`)
        }
        
      } catch (error: any) {
        errors.push({ row: row.id, error: error.message })
        console.error(`  ❌ Error processing row ${row.id}: ${error.message}`)
      }
    }
    
    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 Backfill Complete!')
    console.log('='.repeat(60))
    console.log(`Total rows:        ${total}`)
    console.log(`Successfully processed: ${processed}`)
    console.log(`Errors:           ${errors.length}`)
    console.log(`Warnings:         ${warnings.length}`)
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors (${errors.length}):`)
      errors.slice(0, 10).forEach(e => {
        console.log(`   Row ${e.row}: ${e.error}`)
      })
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more`)
      }
    }
    
    if (warnings.length > 0 && warnings.length <= 10) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`)
      warnings.forEach(w => {
        console.log(`   Row ${w.row} alias "${w.alias}": ${w.error}`)
      })
    }
    
    // Verify counts
    const catalogCount = await query('SELECT COUNT(*) as count FROM catalog_items')
    const aliasCount = await query('SELECT COUNT(*) as count FROM catalog_ocr_aliases')
    
    console.log(`\n✅ Verification:`)
    console.log(`   catalog_items: ${catalogCount.rows[0].count} rows`)
    console.log(`   catalog_ocr_aliases: ${aliasCount.rows[0].count} aliases`)
    
    const avgAliases = parseInt(aliasCount.rows[0].count) / parseInt(catalogCount.rows[0].count)
    console.log(`   Average aliases per item: ${avgAliases.toFixed(1)}`)
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

backfill()
  .then(() => {
    console.log('\n✅ Backfill script completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
