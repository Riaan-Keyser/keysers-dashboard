"use client"

import { useEffect, useState } from "react"
import { Search, RefreshCw, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Equipment {
  id: string
  sku: string
  name: string
  brand: string
  model: string
  sellingPrice: number
  purchasePrice: number | null  // Changed from costPrice
  woocommerceId: string | null
  syncedToWoo: boolean
  lastSyncedAt: string | null
  status: string
}

export default function PricingPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment?status=READY_FOR_SALE")
      const data = await response.json()
      setEquipment(data)
    } catch (error) {
      console.error("Failed to fetch equipment:", error)
    } finally {
      setLoading(false)
    }
  }

  const syncToWooCommerce = async (equipmentId: string) => {
    setSyncing(equipmentId)
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/sync`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchEquipment()
      }
    } catch (error) {
      console.error("Sync failed:", error)
    } finally {
      setSyncing(null)
    }
  }

  const updatePrice = async (equipmentId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      })
      
      if (response.ok) {
        fetchEquipment()
      }
    } catch (error) {
      console.error("Price update failed:", error)
    }
  }

  const calculateMargin = (selling: number, cost: number | null) => {
    if (!cost) return null
    const sellingNum = Number(selling) || 0
    const costNum = Number(cost) || 0
    if (sellingNum === 0) return null
    return ((sellingNum - costNum) / sellingNum * 100).toFixed(1)
  }

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-500 mt-1">Manage prices and sync with WooCommerce</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync All to WooCommerce
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Listed</p>
              <p className="text-2xl font-bold mt-1">{equipment.length}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Synced to WooCommerce</p>
              <p className="text-2xl font-bold mt-1">
                {equipment.filter(e => e.syncedToWoo).length}
              </p>
            </div>
            <RefreshCw className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold mt-1">
                R {equipment.reduce((sum, e) => sum + (Number(e.sellingPrice) || 0), 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>WooCommerce</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No equipment found
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => {
                const purchasePrice = Number(item.purchasePrice) || 0
                const sellingPrice = Number(item.sellingPrice) || 0
                const margin = calculateMargin(sellingPrice, purchasePrice)
                
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.brand} {item.model}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {purchasePrice > 0 ? `R ${purchasePrice.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={sellingPrice}
                        onChange={(e) => updatePrice(item.id, parseFloat(e.target.value))}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      {purchasePrice > 0 && margin ? (
                        <Badge variant={parseFloat(margin) > 30 ? 'success' : 'warning'}>
                          {margin}%
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {item.syncedToWoo ? (
                        <Badge variant="success">Synced</Badge>
                      ) : (
                        <Badge variant="warning">Not Synced</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.lastSyncedAt 
                        ? new Date(item.lastSyncedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncToWooCommerce(item.id)}
                        disabled={syncing === item.id}
                      >
                        {syncing === item.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
