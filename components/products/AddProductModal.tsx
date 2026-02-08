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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: initialSearchTerm,
    brand: "",
    model: "",
    variant: "",
    productType: "CAMERA_BODY",
    activateNow: true,
    buyPriceMin: "",
    buyPriceMax: "",
    consignPriceMin: "",
    consignPriceMax: "",
    description: "",
    // For non-lens products this is free-form text.
    specifications: "",
    // Structured lens specs (used to build JSON when productType === LENS)
    lensMount: "",
    lensFocalMin: "",
    lensFocalMax: "",
    lensApertureMin: "",
    lensApertureMax: "",
    imageUrl: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (formData.productType === "LENS" && formData.activateNow) {
      if (!formData.lensMount.trim()) nextErrors.lensMount = "Mount is required to activate a lens"
      if (!formData.lensFocalMin.trim()) nextErrors.lensFocalMin = "Focal min is required to activate a lens"
      if (!formData.lensApertureMin.trim()) nextErrors.lensApertureMin = "Aperture min is required to activate a lens"
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // Build specs payload
    let specificationsPayload: string | null = formData.specifications || null
    if (formData.productType === "LENS") {
      const lensSpecs: any = {
        mount: formData.lensMount.trim() || undefined,
        focal_min_mm: formData.lensFocalMin ? Number(formData.lensFocalMin) : undefined,
        focal_max_mm: formData.lensFocalMax ? Number(formData.lensFocalMax) : undefined,
        aperture_min: formData.lensApertureMin ? Number(formData.lensApertureMin) : undefined,
        aperture_max: formData.lensApertureMax ? Number(formData.lensApertureMax) : undefined,
      }
      // remove undefined
      Object.keys(lensSpecs).forEach((k) => lensSpecs[k] === undefined && delete lensSpecs[k])
      specificationsPayload = JSON.stringify(lensSpecs)
    }

    onSubmit({
      ...formData,
      specifications: specificationsPayload,
    })
  }

  const handleChange = (field: string, value: string) => {
    // Handle boolean fields stored in state as booleans
    if (field === "activateNow") {
      setFormData({ ...formData, activateNow: value === "true" })
      return
    }
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

          {/* Activation */}
          <div>
            <Label>Activate immediately</Label>
            <Select
              value={formData.activateNow ? "YES" : "NO"}
              onChange={(e) => handleChange("activateNow", e.target.value === "YES" ? "true" : "false")}
            >
              <option value="YES">Yes (Publish)</option>
              <option value="NO">No (Save as Draft)</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Lenses can’t be activated unless mount + focal min + aperture min are provided.
            </p>
          </div>

          {/* Lens structured fields */}
          {formData.productType === "LENS" && (
            <div className="md:col-span-2 border rounded-lg p-4 bg-gray-50 space-y-4">
              <div className="font-semibold text-gray-900">Lens required specs (for activation)</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Mount {formData.activateNow ? "*" : "(optional)"}</Label>
                  <Input
                    value={formData.lensMount}
                    onChange={(e) => handleChange("lensMount", e.target.value)}
                    placeholder="e.g., Canon EF"
                  />
                  {errors.lensMount && <p className="text-xs text-red-600 mt-1">{errors.lensMount}</p>}
                </div>
                <div />
                <div>
                  <Label>Focal min (mm) {formData.activateNow ? "*" : "(optional)"}</Label>
                  <Input
                    type="number"
                    value={formData.lensFocalMin}
                    onChange={(e) => handleChange("lensFocalMin", e.target.value)}
                  />
                  {errors.lensFocalMin && <p className="text-xs text-red-600 mt-1">{errors.lensFocalMin}</p>}
                </div>
                <div>
                  <Label>Focal max (mm) (optional)</Label>
                  <Input
                    type="number"
                    value={formData.lensFocalMax}
                    onChange={(e) => handleChange("lensFocalMax", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Aperture min {formData.activateNow ? "*" : "(optional)"}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.lensApertureMin}
                    onChange={(e) => handleChange("lensApertureMin", e.target.value)}
                  />
                  {errors.lensApertureMin && <p className="text-xs text-red-600 mt-1">{errors.lensApertureMin}</p>}
                </div>
                <div>
                  <Label>Aperture max (optional)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.lensApertureMax}
                    onChange={(e) => handleChange("lensApertureMax", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                These values are stored in `specifications` JSON so the product can be safely activated.
              </p>
            </div>
          )}

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
