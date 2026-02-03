"use client"

import { useEffect, useState } from "react"
import { Search, TrendingUp, DollarSign } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ConsignmentItem {
  id: string
  sku: string
  name: string
  brand: string
  model: string
  vendor: {
    name: string
    email: string | null
  } | null
  sellingPrice: number
  consignmentRate: number | null
  status: string
  acquiredAt: string
}

export default function ConsignmentPage() {
  const [items, setItems] = useState<ConsignmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchConsignmentItems()
  }, [])

  const fetchConsignmentItems = async () => {
    try {
      const response = await fetch("/api/equipment?acquisitionType=CONSIGNMENT")
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error("Failed to fetch consignment items:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate shares with proper number handling
  const calculateShares = (price: number, rate: number | null) => {
    const sellingPrice = Number(price) || 0
    const consignmentRate = Number(rate) || 70
    const vendorShare = sellingPrice * (consignmentRate / 100)
    const storeShare = sellingPrice - vendorShare
    return { vendorShare, storeShare }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.vendor?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate totals with proper number conversion
  const totalConsignmentValue = filteredItems.reduce((sum, item) => sum + (Number(item.sellingPrice) || 0), 0)
  const totalVendorShare = filteredItems.reduce((sum, item) => {
    const { vendorShare } = calculateShares(item.sellingPrice, item.consignmentRate)
    return sum + vendorShare
  }, 0)
  const totalStoreShare = filteredItems.reduce((sum, item) => {
    const { storeShare } = calculateShares(item.sellingPrice, item.consignmentRate)
    return sum + storeShare
  }, 0)

  // Calculate average commission rate
  const avgCommissionRate = filteredItems.length > 0
    ? filteredItems.reduce((sum, item) => sum + (Number(item.consignmentRate) || 70), 0) / filteredItems.length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consignment items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consignment Management</h1>
          <p className="text-gray-500 mt-1">Track equipment on consignment from vendors</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold mt-1">{items.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold mt-1">R {totalConsignmentValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vendor Share</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">R {totalVendorShare.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Store Share</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">R {totalStoreShare.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by equipment, vendor, or SKU..."
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
              <TableHead>Vendor</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Vendor Gets</TableHead>
              <TableHead>Store Gets</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days On Hand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  No consignment items found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const daysOnHand = Math.floor(
                  (new Date().getTime() - new Date(item.acquiredAt).getTime()) / (1000 * 60 * 60 * 24)
                )
                const { vendorShare, storeShare } = calculateShares(item.sellingPrice, item.consignmentRate)
                const rate = Number(item.consignmentRate) || 70
                
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
                      <div>
                        <p className="font-medium">{item.vendor?.name || "Unknown"}</p>
                        {item.vendor?.email && (
                          <p className="text-xs text-gray-500">{item.vendor.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>R {Number(item.sellingPrice).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="info">{rate}%</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-orange-600">
                      R {vendorShare.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      R {storeShare.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === 'READY_FOR_SALE' ? 'success' :
                        item.status === 'SOLD' ? 'default' : 'warning'
                      }>
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={daysOnHand > 90 ? 'text-red-600 font-medium' : ''}>
                        {daysOnHand} days
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Consignment Insights</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Items highlighted in red have been on consignment for over 90 days</li>
          <li>• Consider reaching out to vendors for items that haven't sold within 60 days</li>
          <li>• Average commission rate across all items: {avgCommissionRate.toFixed(1)}%</li>
        </ul>
      </Card>
    </div>
  )
}
