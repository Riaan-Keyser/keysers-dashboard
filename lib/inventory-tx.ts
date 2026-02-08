import { pool } from "@/lib/inventory-db"

export async function withInventoryTx<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (e) {
    try {
      await client.query("ROLLBACK")
    } catch {
      // ignore
    }
    throw e
  } finally {
    client.release()
  }
}

