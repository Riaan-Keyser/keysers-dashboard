"use client"

import { useEffect, useState } from "react"
import { Database, Table, RefreshCw, Trash2, Save, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Column {
  name: string
  type: string
}

interface TableData {
  columns: Column[]
  data: any[]
  total: number
  limit: number
  offset: number
}

export function DatabaseManager() {
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 50

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchTableData()
    }
  }, [selectedTable, page])

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/admin/database/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data)
      }
    } catch (error) {
      console.error("Failed to fetch tables:", error)
    }
  }

  const fetchTableData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/database/${selectedTable}?limit=${pageSize}&offset=${page * pageSize}`
      )
      if (response.ok) {
        const data = await response.json()
        setTableData(data)
      }
    } catch (error) {
      console.error("Failed to fetch table data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCellClick = (rowId: string, field: string, currentValue: any) => {
    setEditingCell({ rowId, field })
    setEditValue(currentValue?.toString() || "")
  }

  const handleSave = async () => {
    if (!editingCell || !selectedTable) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/database/${selectedTable}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCell.rowId,
          field: editingCell.field,
          value: editValue
        })
      })

      if (response.ok) {
        // Update local data
        setTableData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            data: prev.data.map(row =>
              row.id === editingCell.rowId
                ? { ...row, [editingCell.field]: editValue }
                : row
            )
          }
        })
        setEditingCell(null)
      } else {
        alert("Failed to save changes")
      }
    } catch (error) {
      console.error("Failed to save:", error)
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rowId: string) => {
    if (!confirm("Are you sure you want to delete this row?")) return
    
    try {
      const response = await fetch(`/api/admin/database/${selectedTable}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId })
      })

      if (response.ok) {
        fetchTableData()
      } else {
        alert("Failed to delete row")
      }
    } catch (error) {
      console.error("Failed to delete:", error)
      alert("Failed to delete row")
    }
  }

  const formatCellValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return "—"
    if (type === "timestamp with time zone" || type === "timestamp without time zone") {
      return new Date(value).toLocaleString()
    }
    if (typeof value === "object") {
      return JSON.stringify(value)
    }
    return String(value)
  }

  const truncateValue = (value: string, maxLength: number = 50): string => {
    if (value.length <= maxLength) return value
    return value.substring(0, maxLength) + "..."
  }

  const totalPages = tableData ? Math.ceil(tableData.total / pageSize) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-500" />
          <Select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value)
              setPage(0)
            }}
            className="w-64"
          >
            <option value="">Select a table...</option>
            {tables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </Select>
        </div>
        
        {selectedTable && (
          <Button variant="outline" size="sm" onClick={fetchTableData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}

        {tableData && (
          <div className="ml-auto text-sm text-gray-500">
            {tableData.total} total rows
          </div>
        )}
      </div>

      {loading && !tableData && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading table data...</p>
          </div>
        </div>
      )}

      {tableData && tableData.data.length > 0 && (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-10">#</th>
                    {tableData.columns.map(col => (
                      <th key={col.name} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                        <div>{col.name}</div>
                        <div className="text-xs font-normal text-gray-400">{col.type}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tableData.data.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {page * pageSize + idx + 1}
                      </td>
                      {tableData.columns.map(col => (
                        <td key={col.name} className="px-3 py-2">
                          {editingCell?.rowId === row.id && editingCell?.field === col.name ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 text-sm min-w-[150px]"
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" onClick={handleSave} disabled={saving} className="h-7 w-7">
                                <Save className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingCell(null)} className="h-7 w-7">
                                <X className="h-3 w-3 text-gray-400" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => col.name !== 'id' && handleCellClick(row.id, col.name, row[col.name])}
                              className={`${col.name !== 'id' ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''} max-w-[300px] truncate`}
                              title={formatCellValue(row[col.name], col.type)}
                            >
                              {col.name === 'id' ? (
                                <code className="text-xs bg-gray-100 px-1 rounded">{truncateValue(row[col.name], 12)}</code>
                              ) : (
                                <span className={row[col.name] === null ? 'text-gray-300' : ''}>
                                  {truncateValue(formatCellValue(row[col.name], col.type))}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(row.id)}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, tableData.total)} of {tableData.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {tableData && tableData.data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No data in this table</p>
        </div>
      )}

      {!selectedTable && (
        <div className="text-center py-12 text-gray-500">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a table to view and edit data</p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
        <strong>⚠️ Warning:</strong> Direct database editing can cause issues. Only edit if you know what you're doing. 
        Click on any cell (except ID) to edit its value.
      </div>
    </div>
  )
}
