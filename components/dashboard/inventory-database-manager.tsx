"use client"

import { useEffect, useState } from "react"
import { Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InventoryDatabaseManager() {
  const [tables, setTables] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/inventory-db?action=tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data.tables)
        setError(null)
      } else {
        const err = await response.json()
        setError(err.error)
      }
    } catch (err: any) {
      setError("Failed to connect to database")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-700">keysers_inventory Database</span>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchTables} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh Tables
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table List - Opens in new tab */}
      {tables.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map(table => (
            <a
              key={table}
              href={`/dashboard/settings/database/${table}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left block group"
            >
              <div className="font-medium text-gray-900 group-hover:text-blue-600">{table}</div>
              <div className="text-xs text-gray-500 mt-1">Click to open in new tab</div>
            </a>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {/* Instructions */}
      {!loading && tables.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <h4 className="font-semibold text-blue-800 mb-2">💡 How to use:</h4>
          <ul className="text-blue-700 space-y-1">
            <li>• Click on a table name to <strong>open it in a new tab</strong></li>
            <li>• Each tab loads <strong>ALL rows</strong> from that table</li>
            <li>• Search works across <strong>all loaded data</strong>, not just one page</li>
            <li>• Edit cells directly, delete rows, and manage your data easily</li>
            <li>• You can have multiple tables open at the same time</li>
          </ul>
        </div>
      )}
    </div>
  )
}
