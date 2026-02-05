"use client"

import React, { useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, CheckCircle, XCircle, MinusCircle, AlertCircle } from "lucide-react"
import { Select } from "@/components/ui/select"

interface InspectItemModalProps {
  open: boolean
  onClose: () => void
  purchaseId: string
  itemId: string
  onSaved: () => void
}

interface Product {
  id: string
  name: string
  brand: string | null
  model: string | null
  category: string
  buyLow: number
  buyHigh: number
  consignLow: number
  consignHigh: number
}

interface InspectionData {
  productId: string | null
  product: Product | null
  condition: string | null
  serialNumber: string | null
  includedItems: { [key: string]: boolean }
  conditionChecks: { [key: string]: "YES" | "NO" | "NOT_TESTED" }
  notes: string
  inspectionStatus: string
}

const CONDITIONS = [
  { value: "LIKE_NEW", label: "Like New" },
  { value: "EXCELLENT", label: "Excellent" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD", label: "Good" },
  { value: "WORN", label: "Worn" }
]

const LENS_INCLUDED_ITEMS = [
  { key: "lens_hood", label: "Lens hood included?" },
  { key: "front_cap", label: "Front lens cap included?" },
  { key: "rear_cap", label: "Rear lens cap included?" },
  { key: "tripod_collar", label: "Tripod collar ring included?" }
]

const LENS_CONDITION_CHECKS = [
  { key: "dust", label: "Dust in lens?" },
  { key: "scuff_marks", label: "Scuff marks on lens body?" },
  { key: "scratches", label: "Scratches on glass?" },
  { key: "fungus", label: "Fungus/haze?" }
]

const CAMERA_BODY_INCLUDED_ITEMS = [
  { key: "battery", label: "Battery included?" },
  { key: "charger", label: "Charger included?" },
  { key: "body_cap", label: "Body cap included?" },
  { key: "strap", label: "Camera strap included?" }
]

const CAMERA_BODY_CONDITION_CHECKS = [
  { key: "sensor_dust", label: "Sensor dust?" },
  { key: "scratches", label: "Body scratches?" },
  { key: "shutter_count", label: "High shutter count?" },
  { key: "screen_damage", label: "Screen damage?" }
]

const formatPrice = (price: number | null): string => {
  if (!price) return "R0"
  const rounded = Math.round(price)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `R${formatted}`
}

export function InspectItemModal({ open, onClose, purchaseId, itemId, onSaved }: InspectItemModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<InspectionData>({
    productId: null,
    product: null,
    condition: null,
    serialNumber: null,
    includedItems: {},
    conditionChecks: {},
    notes: "",
    inspectionStatus: "UNVERIFIED"
  })
  
  const [originalProductName, setOriginalProductName] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (open && purchaseId && itemId) {
      loadInspectionData()
      loadProducts()
    }
  }, [open, purchaseId, itemId])

  const loadInspectionData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/incoming-gear/pending-items/${itemId}/inspection`)
      if (response.ok) {
        const result = await response.json()
        setData(result.inspection)
        setOriginalProductName(result.originalProductName || "")
      } else {
        console.error("Failed to load inspection data")
      }
    } catch (error) {
      console.error("Error loading inspection data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products?includeArchived=false')
      if (response.ok) {
        const result = await response.json()
        setProducts(result)
      }
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  const handleProductSelect = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setData(prev => ({
        ...prev,
        productId: product.id,
        product: product
      }))
      setSearchQuery("") // Clear search after selection
    }
  }

  const handleSave = async () => {
    if (!data.productId) {
      alert("Please confirm or select a product")
      return
    }
    
    if (!data.condition) {
      alert("Please select a condition")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/incoming-gear/pending-items/${itemId}/inspection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        onSaved()
        onClose()
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error saving inspection:", error)
      alert("Failed to save inspection data")
    } finally {
      setSaving(false)
    }
  }

  const getIncludedItemsForCategory = () => {
    if (!data.product) return []
    
    const category = data.product.category?.toUpperCase()
    if (category === "LENS") return LENS_INCLUDED_ITEMS
    if (category === "CAMERA_BODY") return CAMERA_BODY_INCLUDED_ITEMS
    return []
  }

  const getConditionChecksForCategory = () => {
    if (!data.product) return []
    
    const category = data.product.category?.toUpperCase()
    if (category === "LENS") return LENS_CONDITION_CHECKS
    if (category === "CAMERA_BODY") return CAMERA_BODY_CONDITION_CHECKS
    return []
  }

  // Safely filter products
  const getFilteredProducts = () => {
    if (!Array.isArray(products)) return []
    if (!searchQuery) return []
    
    return products.filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredProducts = getFilteredProducts()

  return (
    <Modal isOpen={open} onClose={onClose} title="Inspect Product" size="xl">
      <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
        <p className="text-sm text-gray-600 mb-6">
          Verify product details, condition, and included items
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* A) Product Identity Confirmation */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Product Identity</Label>
              
              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-sm text-gray-600 mb-1">Original submission:</p>
                <p className="font-medium">{originalProductName}</p>
              </div>

              <div className="space-y-2">
                <Label>Is this the correct product?</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searchQuery && (
                    <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
                      {filteredProducts.slice(0, 50).map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product.id)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 ${
                            data.productId === product.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {product.brand} {product.model} • {product.category}
                          </div>
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="px-3 py-8 text-center text-gray-500">
                          No products found.
                        </div>
                      )}
                    </div>
                  )}
                  {data.product && !searchQuery && (
                    <div className="border rounded-md px-3 py-2 bg-blue-50">
                      <div className="font-medium">{data.product.name}</div>
                      <div className="text-xs text-gray-500">
                        {data.product.brand} {data.product.model} • {data.product.category}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Show pricing when product is selected */}
              {data.product && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Pricing Ranges</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 font-medium">Buy Price</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatPrice(data.product.buyLow)} - {formatPrice(data.product.buyHigh)}
                      </p>
                    </div>
                    <div>
                      <p className="text-orange-700 font-medium">Consignment Price</p>
                      <p className="text-lg font-bold text-orange-900">
                        {formatPrice(data.product.consignLow)} - {formatPrice(data.product.consignHigh)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* B) Condition Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Condition *</Label>
              <Select 
                value={data.condition || ""} 
                onChange={(e) => setData(prev => ({ ...prev, condition: e.target.value }))}
              >
                <option value="">Select condition...</option>
                {CONDITIONS.map(condition => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Serial Number (for camera bodies, lenses, drones) */}
            {data.product && ["CAMERA_BODY", "LENS", "DRONE"].includes(data.product.category?.toUpperCase() || "") && (
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={data.serialNumber || ""}
                  onChange={(e) => setData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="Enter serial number..."
                />
              </div>
            )}

            {/* C) Type-specific Included Items */}
            {data.product && getIncludedItemsForCategory().length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Included Items</Label>
                <div className="space-y-2">
                  {getIncludedItemsForCategory().map(item => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={item.key}
                        checked={data.includedItems[item.key] || false}
                        onChange={(e) => 
                          setData(prev => ({
                            ...prev,
                            includedItems: { ...prev.includedItems, [item.key]: e.target.checked }
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                      <Label htmlFor={item.key} className="font-normal cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition/Optical Checks */}
            {data.product && getConditionChecksForCategory().length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Condition Checks</Label>
                <div className="space-y-3">
                  {getConditionChecksForCategory().map(check => (
                    <div key={check.key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <Label className="font-normal">{check.label}</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={data.conditionChecks[check.key] === "YES" ? "default" : "outline"}
                          className={data.conditionChecks[check.key] === "YES" ? "bg-red-600 hover:bg-red-700" : ""}
                          onClick={() => setData(prev => ({
                            ...prev,
                            conditionChecks: { ...prev.conditionChecks, [check.key]: "YES" }
                          }))}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Yes
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={data.conditionChecks[check.key] === "NO" ? "default" : "outline"}
                          className={data.conditionChecks[check.key] === "NO" ? "bg-green-600 hover:bg-green-700" : ""}
                          onClick={() => setData(prev => ({
                            ...prev,
                            conditionChecks: { ...prev.conditionChecks, [check.key]: "NO" }
                          }))}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          No
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={data.conditionChecks[check.key] === "NOT_TESTED" ? "default" : "outline"}
                          onClick={() => setData(prev => ({
                            ...prev,
                            conditionChecks: { ...prev.conditionChecks, [check.key]: "NOT_TESTED" }
                          }))}
                        >
                          <MinusCircle className="h-3 w-3 mr-1" />
                          Not Tested
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D) Notes */}
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={data.notes}
                onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional comments or observations..."
                rows={4}
              />
            </div>

            {/* Validation Warning */}
            {(!data.productId || !data.condition) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Required fields missing:</p>
                  <ul className="list-disc list-inside mt-1">
                    {!data.productId && <li>Product must be confirmed/selected</li>}
                    {!data.condition && <li>Condition must be selected</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button onClick={handleSave} disabled={saving || loading} className="bg-blue-600 hover:bg-blue-700">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Inspection"
          )}
        </Button>
      </div>
    </Modal>
  )
}
