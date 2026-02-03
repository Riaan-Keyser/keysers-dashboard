"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Database, RefreshCw, Trash2, Save, X, Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Column {
  column_name: string
  data_type: string
  is_nullable: string
}

export default function DatabaseTablePage() {
  const params = useParams()
  const router = useRouter()
  const tableName = params.table as string
  
  const [columns, setColumns] = useState<Column[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Editing state
  const [editingCell, setEditingCell] = useState<{ id: string; column: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [saving, setSaving] = useState(false)
  
  // Search (searches ALL loaded data)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (tableName) {
      fetchTableData()
    }
  }, [tableName])

  const fetchTableData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch ALL data (no pagination)
      const response = await fetch(
        `/api/admin/inventory-db?action=data&table=${tableName}&limit=999999&offset=0`
      )
      if (response.ok) {
        const data = await response.json()
        setColumns(data.columns)
        setRows(data.rows)
      } else {
        const err = await response.json()
        setError(err.error)
      }
    } catch (err: any) {
      setError("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleCellClick = (id: string, column: string, value: any) => {
    if (column === 'id') return // Don't allow editing ID
    setEditingCell({ id, column })
    setEditValue(value === null ? "" : String(value))
  }

  const handleSave = async () => {
    if (!editingCell) return
    setSaving(true)
    try {
      const response = await fetch("/api/admin/inventory-db", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: tableName,
          id: editingCell.id,
          column: editingCell.column,
          value: editValue || null
        })
      })

      if (response.ok) {
        // Update local state
        setRows(prev => prev.map(row =>
          row.id === editingCell.id
            ? { ...row, [editingCell.column]: editValue || null }
            : row
        ))
        setEditingCell(null)
      } else {
        const err = await response.json()
        alert(`Error: ${err.error}`)
      }
    } catch (err) {
      alert("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this row? This cannot be undone.")) return
    
    try {
      const response = await fetch("/api/admin/inventory-db", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: tableName, id })
      })

      if (response.ok) {
        setRows(prev => prev.filter(row => row.id !== id))
      } else {
        const err = await response.json()
        alert(`Error: ${err.error}`)
      }
    } catch (err) {
      alert("Failed to delete")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "NULL"
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleString()
      return JSON.stringify(value)
    }
    return String(value)
  }

  // Search across ALL loaded data
  const filteredRows = searchTerm
    ? rows.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : rows

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[95vw] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.close()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Close Tab
            </Button>
            
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">keysers_inventory</span>
              <span className="text-gray-400">/</span>
              <span className="font-medium text-blue-600">{tableName}</span>
            </div>

            <Button variant="outline" size="sm" onClick={fetchTableData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search all rows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-80"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 text-sm text-gray-600">
            Total rows: <span className="font-semibold">{rows.length.toLocaleString()}</span>
            {searchTerm && (
              <span className="ml-4">
                Matching: <span className="font-semibold text-blue-600">{filteredRows.length.toLocaleString()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600">Loading all data...</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    {columns.map(col => (
                      <th
                        key={col.column_name}
                        className="px-3 py-3 text-left font-semibold text-gray-700 border-b whitespace-nowrap"
                      >
                        <div>{col.column_name}</div>
                        <div className="text-xs font-normal text-gray-400">{col.data_type}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-semibold text-gray-700 border-b w-16 sticky right-0 bg-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-gray-50">
                      {columns.map(col => (
                        <td
                          key={col.column_name}
                          className="px-3 py-2 border-r last:border-r-0"
                        >
                          {editingCell?.id === row.id && editingCell?.column === col.column_name ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="border rounded px-2 py-1 text-sm w-full min-w-[100px]"
                                autoFocus
                              />
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="p-1 hover:bg-green-100 rounded flex-shrink-0"
                              >
                                <Save className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                              >
                                <X className="h-4 w-4 text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleCellClick(row.id, col.column_name, row[col.column_name])}
                              className={`
                                ${col.column_name !== 'id' ? 'cursor-pointer hover:bg-blue-50' : ''}
                                px-1 py-0.5 rounded max-w-[400px] truncate
                                ${row[col.column_name] === null ? 'text-gray-300 italic' : ''}
                              `}
                              title={formatValue(row[col.column_name])}
                            >
                              {col.column_name === 'id' ? (
                                <code className="text-xs bg-gray-100 px-1 rounded">
                                  {String(row[col.column_name]).substring(0, 8)}...
                                </code>
                              ) : (
                                formatValue(row[col.column_name])
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center sticky right-0 bg-white">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1 hover:bg-red-100 rounded inline-block"
                          title="Delete row"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
            <p className="text-gray-500">No data in this table</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm mt-4">
          <h4 className="font-semibold text-blue-800 mb-2">💡 How to use:</h4>
          <ul className="text-blue-700 space-y-1">
            <li>• All rows are loaded - search will find anything in the table</li>
            <li>• Click on any cell to edit it (except ID columns)</li>
            <li>• Press <kbd className="bg-blue-100 px-1 rounded">Enter</kbd> to save or <kbd className="bg-blue-100 px-1 rounded">Esc</kbd> to cancel</li>
            <li>• Use the search box at the top to filter results across ALL data</li>
            <li>• Click the trash icon to delete a row (cannot be undone)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
