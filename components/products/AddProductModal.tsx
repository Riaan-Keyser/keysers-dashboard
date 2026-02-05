"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Package } from "lucide-react"

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

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  initialSearchTerm?: string
  onSubmit: (productData: any) => void
}

export function AddProductModal({ isOpen, onClose, initialSearchTerm = "", onSubmit }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: initialSearchTerm,
    brand: "",
    model: "",
    variant: "",
    productType: "CAMERA_BODY",
    buyPriceMin: "",
    buyPriceMax: "",
    consignPriceMin: "",
    consignPriceMax: "",
    description: "",
    specifications: "",
    imageUrl: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Product Information</h3>
          </div>
          <p className="text-sm text-blue-700">
            Fill in all product details. An admin will need to approve before the product is added to the database.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="md:col-span-2">
            <Label>Product Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Canon EOS R5"
              required
            />
          </div>

          {/* Brand */}
          <div>
            <Label>Brand *</Label>
            <Input
              value={formData.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              placeholder="e.g., Canon"
              required
            />
          </div>

          {/* Model */}
          <div>
            <Label>Model *</Label>
            <Input
              value={formData.model}
              onChange={(e) => handleChange("model", e.target.value)}
              placeholder="e.g., EOS R5"
              required
            />
          </div>

          {/* Variant */}
          <div>
            <Label>Variant (optional)</Label>
            <Input
              value={formData.variant}
              onChange={(e) => handleChange("variant", e.target.value)}
              placeholder="e.g., Body Only"
            />
          </div>

          {/* Product Type */}
          <div>
            <Label>Product Type *</Label>
            <Select
              value={formData.productType}
              onChange={(e) => handleChange("productType", e.target.value)}
              required
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Buy Price Range */}
          <div>
            <Label>Buy Price Min (R) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.buyPriceMin}
              onChange={(e) => handleChange("buyPriceMin", e.target.value)}
              placeholder="e.g., 15000"
              required
            />
          </div>

          <div>
            <Label>Buy Price Max (R) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.buyPriceMax}
              onChange={(e) => handleChange("buyPriceMax", e.target.value)}
              placeholder="e.g., 20000"
              required
            />
          </div>

          {/* Consign Price Range */}
          <div>
            <Label>Consign Price Min (R) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.consignPriceMin}
              onChange={(e) => handleChange("consignPriceMin", e.target.value)}
              placeholder="e.g., 25000"
              required
            />
          </div>

          <div>
            <Label>Consign Price Max (R) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.consignPriceMax}
              onChange={(e) => handleChange("consignPriceMax", e.target.value)}
              placeholder="e.g., 30000"
              required
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Brief description of the product..."
              rows={3}
            />
          </div>

          {/* Specifications */}
          <div className="md:col-span-2">
            <Label>Specifications (optional)</Label>
            <Textarea
              value={formData.specifications}
              onChange={(e) => handleChange("specifications", e.target.value)}
              placeholder="Technical specifications..."
              rows={3}
            />
          </div>

          {/* Image URL */}
          <div className="md:col-span-2">
            <Label>Image URL (optional)</Label>
            <Input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => handleChange("imageUrl", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Continue to Admin Approval
          </Button>
        </div>
      </form>
    </Modal>
  )
}
