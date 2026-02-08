#!/usr/bin/env tsx
/**
 * Check the current state of the keysers_inventory database
 */

import 'dotenv/config'
import { query } from '@/lib/inventory-db'

async function checkDatabase() {
  try {
    console.log('🔍 Checking keysers_inventory database...\n')
    
    // Check if database is accessible
    const testQuery = await query('SELECT 1 as test')
    console.log('✅ Database connection successful\n')
    
    // Get all tables
    const tables = await query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)
    
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found in keysers_inventory database')
      console.log('   The database is empty.\n')
      return
    }
    
    console.log(`📊 Found ${tables.rows.length} tables:\n`)
    
    // Get details for each table
    for (const table of tables.rows) {
      const tableName = table.tablename
      
      // Get row count
      const count = await query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      const rowCount = parseInt(count.rows[0].count)
      
      // Get column count
      const columns = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName])
      const colCount = parseInt(columns.rows[0].count)
      
      console.log(`  📋 ${tableName}`)
      console.log(`     Rows: ${rowCount.toLocaleString()}`)
      console.log(`     Columns: ${colCount}`)
      
      // Check for key columns
      const colNames = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
        LIMIT 10
      `, [tableName])
      
      const columnList = colNames.rows.map(r => r.column_name).join(', ')
      console.log(`     Sample columns: ${columnList}`)
      console.log()
    }
    
    // Check if cleanup tables exist
    console.log('\n🔍 Checking for catalog cleanup tables...')
    
    const cleanupTables = ['catalog_items', 'catalog_ocr_aliases']
    let hasCleanupTables = false
    
    for (const cleanupTable of cleanupTables) {
      const exists = tables.rows.some(t => t.tablename === cleanupTable)
      if (exists) {
        console.log(`   ✅ ${cleanupTable} exists`)
        hasCleanupTables = true
      } else {
        console.log(`   ❌ ${cleanupTable} does NOT exist`)
      }
    }
    
    if (!hasCleanupTables) {
      console.log('\n⚠️  Catalog cleanup has NOT been implemented yet.')
      console.log('   The database still has the original structure.')
      console.log('   See: CATALOG_DATABASE_CLEANUP.md for the cleanup plan.')
    } else {
      console.log('\n✅ Catalog cleanup tables detected!')
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
