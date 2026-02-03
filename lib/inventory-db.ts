import { Pool } from 'pg'

// Connection to the existing keysers_inventory database
const pool = new Pool({
  host: process.env.INVENTORY_DB_HOST || 'localhost',
  port: parseInt(process.env.INVENTORY_DB_PORT || '5432'),
  database: process.env.INVENTORY_DB_NAME || 'keysers_inventory',
  user: process.env.INVENTORY_DB_USER || 'keysers',
  password: process.env.INVENTORY_DB_PASSWORD || process.env.DB_PASSWORD || ''
})

export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function getTables() {
  const result = await query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  return result.rows.map((r: any) => r.tablename)
}

export async function getTableColumns(tableName: string) {
  const result = await query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName])
  return result.rows
}

export async function getTableData(tableName: string, limit: number = 100, offset: number = 0) {
  // Sanitize table name
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '')
  
  const dataResult = await query(`SELECT * FROM "${safeTable}" ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset])
  const countResult = await query(`SELECT COUNT(*) as total FROM "${safeTable}"`)
  
  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total)
  }
}

export async function updateCell(tableName: string, id: string, column: string, value: any) {
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '')
  const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '')
  
  await query(`UPDATE "${safeTable}" SET "${safeColumn}" = $1 WHERE id = $2`, [value, id])
}

export async function deleteRow(tableName: string, id: string) {
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '')
  await query(`DELETE FROM "${safeTable}" WHERE id = $1`, [id])
}

export { pool }
