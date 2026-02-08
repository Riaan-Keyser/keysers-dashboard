#!/usr/bin/env tsx
/**
 * Inspect current equipment_inventory table structure and data
 */

import 'dotenv/config'
import { query } from '@/lib/inventory-db'
import fs from 'fs'

async function inspect() {
  try {
    console.log('🔍 Inspecting equipment_inventory table...\n')
    
    // Get column details
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'equipment_inventory' 
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Table Schema:')
    console.log('================')
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    
    // Get sample data (5 rows)
    const samples = await query(`
      SELECT * FROM equipment_inventory 
      ORDER BY id 
      LIMIT 5
    `)
    
    console.log('\n📊 Sample Data (5 rows):')
    console.log('========================')
    
    // Get row count
    const count = await query('SELECT COUNT(*) as total FROM equipment_inventory')
    console.log(`Total rows: ${count.rows[0].total}\n`)
    
    // Analyze specifications JSONB structure
    const specsAnalysis = await query(`
      SELECT DISTINCT jsonb_object_keys(specifications) as spec_key
      FROM equipment_inventory
      WHERE specifications IS NOT NULL
      ORDER BY spec_key
    `)
    
    console.log('🔧 Specifications JSONB Keys Found:')
    console.log('====================================')
    specsAnalysis.rows.forEach(row => {
      console.log(`  - ${row.spec_key}`)
    })
    
    // Analyze ai_matching JSONB structure
    const aiAnalysis = await query(`
      SELECT DISTINCT jsonb_typeof(ai_matching) as type, COUNT(*) as count
      FROM equipment_inventory
      WHERE ai_matching IS NOT NULL
      GROUP BY type
    `)
    
    console.log('\n🤖 AI Matching JSONB Types:')
    console.log('============================')
    aiAnalysis.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count} rows`)
    })
    
    // Check for lenses specifically
    const lensCount = await query(`
      SELECT COUNT(*) as count
      FROM equipment_inventory
      WHERE product_type = 'lens' OR product_type ILIKE '%lens%'
    `)
    
    console.log(`\n🔍 Lens Products: ${lensCount.rows[0].count}`)
    
    // Sample lens data with specs
    const lensSample = await query(`
      SELECT make, model, product_type, specifications, ai_matching
      FROM equipment_inventory
      WHERE product_type = 'lens' OR product_type ILIKE '%lens%'
      LIMIT 3
    `)
    
    console.log('\n📸 Sample Lens Data:')
    console.log('====================')
    lensSample.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.make} ${row.model}`)
      console.log(`   Type: ${row.product_type}`)
      console.log(`   Specs: ${JSON.stringify(row.specifications, null, 2)}`)
      console.log(`   AI Matching: ${JSON.stringify(row.ai_matching, null, 2)}`)
    })
    
    // Save detailed report
    const report = {
      table: 'equipment_inventory',
      totalRows: count.rows[0].total,
      lensCount: lensCount.rows[0].count,
      schema: columns.rows,
      specsKeys: specsAnalysis.rows.map(r => r.spec_key),
      aiMatchingTypes: aiAnalysis.rows,
      sampleRows: samples.rows,
      lensSamples: lensSample.rows
    }
    
    fs.writeFileSync(
      'reports/equipment-inventory-inspection.json',
      JSON.stringify(report, null, 2)
    )
    
    console.log('\n✅ Detailed report saved to: reports/equipment-inventory-inspection.json')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Create reports directory if not exists
import { mkdirSync } from 'fs'
try {
  mkdirSync('reports', { recursive: true })
} catch {}

inspect()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
