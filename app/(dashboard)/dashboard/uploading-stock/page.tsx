"use client"

import { useEffect, useState } from "react"
import { Package, Check, Edit, DollarSign, MapPin, Hash, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AdminApprovalModal } from "@/components/products/AdminApprovalModal"

interface Equipment {
  id: string
  sku: string
  name: string
  brand: string
  model: string
  category: string
  condition: string
  serialNumber: string | null
  description: string | null
  acquisitionType: string
  purchasePrice: number | null
  costPrice: number | null
  sellingPrice: number
  consignmentRate: number | null
  intakeStatus: string
  shelfLocation: number | null
  status: string
  images: string[]
  sourceVerifiedItemId: string | null
  createdAt: string
}

export default function UploadingStockPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null)
  const [showIntakeModal, setShowIntakeModal] = useState(false)
  const [showAdminApproval, setShowAdminApproval] = useState(false)
  const [saving, setSaving] = useState(false)

  // Intake form data
  const [intakeData, setIntakeData] = useState({
    sku: "",
    shelfLocation: "",
    sellingPrice: "",
    description: ""
  })

  const [pendingAdminAction, setPendingAdminAction] = useState<{
    type: "price_change" | "complete_intake"
    data: any
  } | null>(null)

  useEffect(() => {
    fetchPendingIntake()
  }, [])

  const fetchPendingIntake = async () => {
    try {
      const response = await fetch("/api/equipment?intakeStatus=PENDING_INTAKE")
      if (response.ok) {
        const data = await response.json()
        setEquipment(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to fetch pending intake:", error)
    } finally {
      setLoading(false)
    }
  }

  const openIntakeModal = (item: Equipment) => {
    setSelectedItem(item)
    setIntakeData({
      sku: item.sku,
      shelfLocation: item.shelfLocation?.toString() || "",
      sellingPrice: item.sellingPrice.toString(),
      description: item.description || ""
    })
    setShowIntakeModal(true)
  }

  const calculateProfit = (sellingPrice: number, costPrice: number): string => {
    if (!costPrice || costPrice === 0) return "0"
    const profit = ((sellingPrice - costPrice) / costPrice) * 100
    return profit.toFixed(1)
  }

  const handleSaveIntake = async () => {
    if (!selectedItem) return

    // Check if selling price changed - requires admin approval
    const priceChanged = parseFloat(intakeData.sellingPrice) !== selectedItem.sellingPrice

    if (priceChanged) {
      // Store pending action and open admin approval
      setPendingAdminAction({
        type: "price_change",
        data: intakeData
      })
      setShowAdminApproval(true)
      return
    }

    // No price change, save directly
    await saveSKUIntakeData(intakeData, null, null)
  }

  const saveSKUIntakeData = async (data: any, adminId: string | null, adminPassword: string | null) => {
    if (!selectedItem) return

    setSaving(true)
    try {
      const response = await fetch(`/api/equipment/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: data.sku,
          shelfLocation: data.shelfLocation ? parseInt(data.shelfLocation) : null,
          sellingPrice: parseFloat(data.sellingPrice),
          description: data.description,
          adminId,
          adminPassword
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update")
      }

      setShowIntakeModal(false)
      setShowAdminApproval(false)
      setPendingAdminAction(null)
      fetchPendingIntake()
    } catch (error) {
      console.error("Failed to save intake data:", error)
      alert("Failed to save intake data")
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteIntake = async (itemId: string) => {
    const item = equipment.find(e => e.id === itemId)
    if (!item) return

    // Validation
    if (!item.sku) {
      alert("SKU is required before completing intake")
      return
    }
    if (!item.shelfLocation) {
      alert("Shelf location is required before completing intake")
      return
    }
    if (!item.sellingPrice || item.sellingPrice === 0) {
      alert("Selling price is required before completing intake")
      return
    }

    // Requires admin approval
    setPendingAdminAction({
      type: "complete_intake",
      data: { itemId }
    })
    setShowAdminApproval(true)
  }

  const completeIntakeWithApproval = async (adminId: string, adminPassword: string) => {
    if (!pendingAdminAction || pendingAdminAction.type !== "complete_intake") return

    setSaving(true)
    try {
      const response = await fetch(`/api/equipment/${pendingAdminAction.data.itemId}/complete-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, adminPassword })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete intake")
      }

      setShowAdminApproval(false)
      setPendingAdminAction(null)
      fetchPendingIntake()
      alert("Intake completed successfully! Item moved to Inventory.")
    } catch (error) {
      console.error("Failed to complete intake:", error)
      alert("Failed to complete intake")
    } finally {
      setSaving(false)
    }
  }

  const handleAdminApproval = async (adminId: string, adminPassword: string) => {
    if (!pendingAdminAction) return

    if (pendingAdminAction.type === "price_change") {
      await saveSKUIntakeData(pendingAdminAction.data, adminId, adminPassword)
    } else if (pendingAdminAction.type === "complete_intake") {
      await completeIntakeWithApproval(adminId, adminPassword)
    }
  }

  const getAcquisitionBadge = (type: string) => {
    if (type === "CONSIGNMENT") {
      return <Badge variant="warning">Consignment</Badge>
    }
    return <Badge variant="default">Buy</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading uploading stock...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Uploading Stock</h1>
          <p className="text-gray-500 mt-1">Complete intake requirements before adding to inventory</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">Pending Intake</p>
              <p className="text-2xl font-bold">{equipment.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Buy Items</p>
          <p className="text-2xl font-bold text-blue-600">
            {equipment.filter(e => e.acquisitionType === "PURCHASED_OUTRIGHT").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Consignment Items</p>
          <p className="text-2xl font-bold text-purple-600">
            {equipment.filter(e => e.acquisitionType === "CONSIGNMENT").length}
          </p>
        </Card>
      </div>

      {/* Equipment List */}
      {equipment.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Pending Intake</h3>
          <p className="text-gray-500">
            Items will appear here after payment is received (for Buy items) or after client selection (for Consignment items).
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {equipment.map((item) => {
            const costPrice = item.costPrice || 0
            const profit = calculateProfit(item.sellingPrice, costPrice)
            const isComplete = !!(item.sku && item.shelfLocation && item.sellingPrice)

            return (
              <Card key={item.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getAcquisitionBadge(item.acquisitionType)}
                      {item.sku ? (
                        <Badge variant="info">
                          <Hash className="h-3 w-3 mr-1" />
                          {item.sku}
                        </Badge>
                      ) : (
                        <Badge variant="danger">No SKU</Badge>
                      )}
                      {item.shelfLocation ? (
                        <Badge variant="success">
                          <MapPin className="h-3 w-3 mr-1" />
                          Shelf {item.shelfLocation}
                        </Badge>
                      ) : (
                        <Badge variant="warning">No Location</Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.brand} {item.model}</p>
                    {item.serialNumber && (
                      <p className="text-xs text-gray-500 mt-1">S/N: {item.serialNumber}</p>
                    )}

                    {/* Pricing Info */}
                    <div className="mt-3 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Cost Price</p>
                        <p className="text-sm font-semibold">
                          R {costPrice.toLocaleString()}
                        </p>
                        {item.acquisitionType === "PURCHASED_OUTRIGHT" && (
                          <span className="text-xs text-gray-500">(Locked)</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Selling Price</p>
                        <p className="text-sm font-semibold text-green-600">
                          R {item.sellingPrice.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Profit</p>
                        <p className={`text-sm font-semibold ${parseFloat(profit) > 30 ? "text-green-600" : parseFloat(profit) > 15 ? "text-orange-600" : "text-red-600"}`}>
                          {profit}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openIntakeModal(item)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Intake
                    </Button>
                    {isComplete && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCompleteIntake(item.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Complete Intake
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Intake Modal */}
      <Modal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        title="Complete Equipment Intake"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">{selectedItem.name}</h3>
              <p className="text-sm text-gray-600">{selectedItem.brand} {selectedItem.model}</p>
            </div>

            {/* SKU */}
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={intakeData.sku}
                onChange={(e) => setIntakeData({ ...intakeData, sku: e.target.value.toUpperCase() })}
                placeholder="CA-1234"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-generated. You can edit if needed. Format: PREFIX-XXXX
              </p>
            </div>

            {/* Shelf Location */}
            <div>
              <Label htmlFor="shelfLocation">Shelf Location (1-80) *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  id="shelfLocation"
                  value={intakeData.shelfLocation}
                  onChange={(e) => setIntakeData({ ...intakeData, shelfLocation: e.target.value })}
                >
                  <option value="">Select shelf...</option>
                  {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>Shelf {num}</option>
                  ))}
                </Select>
                <div>
                  <Input
                    placeholder="Or scan QR code"
                    value={intakeData.shelfLocation}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "") // Only numbers
                      if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 80)) {
                        setIntakeData({ ...intakeData, shelfLocation: val })
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost Price</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`R ${(selectedItem.costPrice || 0).toLocaleString()}`}
                    disabled
                    className="bg-gray-100"
                  />
                  {selectedItem.acquisitionType === "PURCHASED_OUTRIGHT" && (
                    <Badge variant="default" className="text-xs">Locked</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedItem.acquisitionType === "CONSIGNMENT" ? "Consignment payout" : "Amount paid"}
                </p>
              </div>
              <div>
                <Label htmlFor="sellingPrice">Selling Price * {selectedItem.acquisitionType === "PURCHASED_OUTRIGHT" && <span className="text-orange-600">(Admin Approval)</span>}</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  value={intakeData.sellingPrice}
                  onChange={(e) => setIntakeData({ ...intakeData, sellingPrice: e.target.value })}
                  placeholder="0"
                />
                {intakeData.sellingPrice && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Profit: {calculateProfit(parseFloat(intakeData.sellingPrice), selectedItem.costPrice || 0)}%
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={intakeData.description}
                onChange={(e) => setIntakeData({ ...intakeData, description: e.target.value })}
                placeholder="Product description for listing..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                AI description generation coming in Phase 5
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowIntakeModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveIntake}
                disabled={!intakeData.sku || !intakeData.shelfLocation || !intakeData.sellingPrice || saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Approval Modal */}
      <AdminApprovalModal
        isOpen={showAdminApproval}
        onClose={() => {
          setShowAdminApproval(false)
          setPendingAdminAction(null)
        }}
        onApprove={async (adminId, adminPassword) => {
          if (pendingAdminAction?.type === "price_change") {
            await saveIntakeData(pendingAdminAction.data, adminId, adminPassword)
          } else if (pendingAdminAction?.type === "complete_intake") {
            await completeIntakeWithApproval(adminId, adminPassword)
          }
        }}
        loading={saving}
      />
    </div>
  )
}
