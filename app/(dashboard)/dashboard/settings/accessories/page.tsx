"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertModal } from "@/components/ui/alert-modal"
import { formatPrice } from "@/lib/inspection-pricing"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import Link from "next/link"

const PRODUCT_TYPES = [
  { value: "CAMERA_BODY", label: "Camera Body" },
  { value: "LENS", label: "Lens" },
  { value: "FLASH", label: "Flash" },
  { value: "TRIPOD", label: "Tripod" },
  { value: "BAG", label: "Bag" },
  { value: "MEMORY_CARD", label: "Memory Card" },
  { value: "BATTERY", label: "Battery" },
  { value: "CHARGER", label: "Charger" },
  { value: "FILTER", label: "Filter" },
  { value: "VIDEO_CAMERA", label: "Video Camera" },
  { value: "DRONE", label: "Drone" },
  { value: "GIMBAL", label: "Gimbal" },
  { value: "MICROPHONE", label: "Microphone" },
  { value: "LIGHTING", label: "Lighting" },
  { value: "STUDIO_EQUIPMENT", label: "Studio Equipment" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" }
]

interface AccessoryTemplate {
  id: string
  productType: string
  accessoryName: string
  penaltyAmount: number | null
  accessoryOrder: number
}

export default function AccessoriesSettingsPage() {
  const [selectedProductType, setSelectedProductType] = useState<string>("CAMERA_BODY")
  const [accessories, setAccessories] = useState<AccessoryTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [newAccessory, setNewAccessory] = useState({
    accessoryName: "",
    penaltyAmount: ""
  })
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    type: "success" | "error" | "info" | "warning"
  }>({
    isOpen: false,
    message: "",
    type: "info"
  })

  useEffect(() => {
    if (selectedProductType) {
      fetchAccessories()
    }
  }, [selectedProductType])

  const fetchAccessories = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/settings/accessories?productType=${selectedProductType}`)
      const data = await response.json()
      setAccessories(data.accessories || [])
    } catch (error) {
      console.error("Failed to fetch accessories:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccessory = async () => {
    if (!newAccessory.accessoryName.trim()) return

    try {
      const response = await fetch("/api/settings/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: selectedProductType,
          accessoryName: newAccessory.accessoryName.trim(),
          penaltyAmount: newAccessory.penaltyAmount ? parseFloat(newAccessory.penaltyAmount) : null,
          accessoryOrder: accessories.length
        })
      })

      if (response.ok) {
        setNewAccessory({ accessoryName: "", penaltyAmount: "" })
        fetchAccessories()
        setAlertModal({
          isOpen: true,
          message: "Accessory added successfully!",
          type: "success"
        })
      } else {
        const data = await response.json()
        setAlertModal({
          isOpen: true,
          message: data.error || "Failed to add accessory",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to add accessory:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to add accessory",
        type: "error"
      })
    }
  }

  const handleDeleteAccessory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this accessory template?")) return

    try {
      const response = await fetch(`/api/settings/accessories?id=${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        fetchAccessories()
      } else {
        setAlertModal({
          isOpen: true,
          message: "Failed to delete accessory",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to delete accessory:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to delete accessory",
        type: "error"
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Accessories Management</h1>
            <p className="text-gray-500">Manage default accessories for each product type</p>
          </div>
        </div>
      </div>

      {/* Product Type Selector */}
      <Card className="p-6">
        <Label>Select Product Type</Label>
        <Select
          value={selectedProductType}
          onChange={(e) => setSelectedProductType(e.target.value)}
          className="mt-2"
        >
          {PRODUCT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Card>

      {/* Add New Accessory */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Add Default Accessory</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Accessory Name</Label>
            <Input
              placeholder="e.g., Original Battery"
              value={newAccessory.accessoryName}
              onChange={(e) => setNewAccessory({ ...newAccessory, accessoryName: e.target.value })}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddAccessory()
                }
              }}
            />
          </div>
          <div>
            <Label>Penalty Amount (optional)</Label>
            <Input
              type="number"
              placeholder="e.g., 500"
              value={newAccessory.penaltyAmount}
              onChange={(e) => setNewAccessory({ ...newAccessory, penaltyAmount: e.target.value })}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddAccessory()
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAddAccessory}
              disabled={!newAccessory.accessoryName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Accessory
            </Button>
          </div>
        </div>
      </Card>

      {/* Accessories List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Default Accessories for {PRODUCT_TYPES.find(t => t.value === selectedProductType)?.label}
        </h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : accessories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No default accessories configured for this product type.
            <br />
            Add your first accessory above.
          </div>
        ) : (
          <div className="space-y-2">
            {accessories.map((accessory) => (
              <div
                key={accessory.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium">{accessory.accessoryName}</p>
                  {accessory.penaltyAmount && (
                    <p className="text-sm text-gray-500">
                      Penalty: {formatPrice(accessory.penaltyAmount)}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleDeleteAccessory(accessory.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select a product type to manage its default accessories</li>
          <li>• Add accessories that should appear on the inspection checklist</li>
          <li>• Set penalty amounts (optional) that deduct from the buy price if missing</li>
          <li>• These accessories will automatically appear when inspecting products of this type</li>
          <li>• Staff can still add custom accessories during inspection if needed</li>
        </ul>
      </Card>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  )
}
