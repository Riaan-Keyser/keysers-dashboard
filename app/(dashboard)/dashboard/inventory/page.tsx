"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Edit, Trash2, Eye, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"

interface Vendor {
  id: string
  name: string
}

interface Equipment {
  id: string
  sku: string
  name: string
  brand: string
  model: string
  category: string
  condition: string
  description: string | null
  serialNumber: string | null
  acquisitionType: string
  vendorId: string | null
  vendor?: Vendor | null
  purchasePrice: number | null
  sellingPrice: number
  consignmentRate: number | null
  costPrice: number | null
  status: string
  location: string | null
  acquiredAt: string
  createdAt: string
}

const categories = [
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

const conditions = [
  { value: "NEW", label: "New" },
  { value: "MINT", label: "Mint" },
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "FOR_PARTS", label: "For Parts" }
]

const acquisitionTypes = [
  { value: "PURCHASED_OUTRIGHT", label: "Purchased Outright" },
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "TRADE_IN", label: "Trade-In" },
  { value: "SUPPLIER", label: "From Supplier" }
]

const statuses = [
  { value: "PENDING_INSPECTION", label: "Pending Onboarding" },
  { value: "INSPECTED", label: "Onboarded" },
  { value: "IN_REPAIR", label: "In Repair" },
  { value: "REPAIR_COMPLETED", label: "Repair Completed" },
  { value: "READY_FOR_SALE", label: "Ready for Sale" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD", label: "Sold" },
  { value: "RETURNED_TO_VENDOR", label: "Returned to Vendor" },
  { value: "RETIRED", label: "Retired" }
]

const emptyEquipment = {
  name: "",
  brand: "",
  model: "",
  category: "CAMERA_BODY",
  condition: "GOOD",
  description: "",
  serialNumber: "",
  acquisitionType: "PURCHASED_OUTRIGHT",
  vendorId: "",
  purchasePrice: "",
  sellingPrice: "",
  consignmentRate: "70",
  costPrice: "",
  status: "PENDING_INSPECTION",
  location: ""
}

export default function InventoryPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState(emptyEquipment)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEquipment()
    fetchVendors()
  }, [])

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment")
      const data = await response.json()
      // Ensure data is an array
      setEquipment(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch equipment:", error)
      setEquipment([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors")
      const data = await response.json()
      // Ensure data is an array
      setVendors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch vendors:", error)
      setVendors([])
    }
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const payload = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        consignmentRate: formData.acquisitionType === "CONSIGNMENT" ? parseFloat(formData.consignmentRate) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        vendorId: formData.vendorId || null
      }

      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowAddModal(false)
        setFormData(emptyEquipment)
        fetchEquipment()
      }
    } catch (error) {
      console.error("Failed to add equipment:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedEquipment) return
    setSaving(true)
    try {
      const payload = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        consignmentRate: formData.acquisitionType === "CONSIGNMENT" ? parseFloat(formData.consignmentRate) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        vendorId: formData.vendorId || null
      }

      const response = await fetch(`/api/equipment/${selectedEquipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowEditModal(false)
        setSelectedEquipment(null)
        setFormData(emptyEquipment)
        fetchEquipment()
      }
    } catch (error) {
      console.error("Failed to update equipment:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEquipment) return
    setSaving(true)
    try {
      const response = await fetch(`/api/equipment/${selectedEquipment.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setShowDeleteModal(false)
        setSelectedEquipment(null)
        fetchEquipment()
      }
    } catch (error) {
      console.error("Failed to delete equipment:", error)
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (item: Equipment) => {
    setSelectedEquipment(item)
    setFormData({
      name: item.name,
      brand: item.brand,
      model: item.model,
      category: item.category,
      condition: item.condition,
      description: item.description || "",
      serialNumber: item.serialNumber || "",
      acquisitionType: item.acquisitionType,
      vendorId: item.vendorId || "",
      purchasePrice: item.purchasePrice?.toString() || "",
      sellingPrice: item.sellingPrice.toString(),
      consignmentRate: item.consignmentRate?.toString() || "70",
      costPrice: item.costPrice?.toString() || "",
      status: item.status,
      location: item.location || ""
    })
    setShowEditModal(true)
  }

  const openViewModal = (item: Equipment) => {
    setSelectedEquipment(item)
    setShowViewModal(true)
  }

  const openDeleteModal = (item: Equipment) => {
    setSelectedEquipment(item)
    setShowDeleteModal(true)
  }

  const getStatusColor = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    const colors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      PENDING_INSPECTION: "warning",
      INSPECTED: "success",
      IN_REPAIR: "warning",
      REPAIR_COMPLETED: "info",
      READY_FOR_SALE: "success",
      RESERVED: "info",
      SOLD: "default",
      RETURNED_TO_VENDOR: "danger",
      RETIRED: "default"
    }
    return colors[status] || "default"
  }

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter
    const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const totalValue = equipment
    .filter(e => !["SOLD", "RETIRED", "RETURNED_TO_VENDOR"].includes(e.status))
    .reduce((sum, e) => sum + (Number(e.sellingPrice) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Manage all camera equipment and accessories</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold">{equipment.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Ready for Sale</p>
          <p className="text-2xl font-bold text-green-600">
            {equipment.filter(e => e.status === "READY_FOR_SALE").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pending Onboarding</p>
          <p className="text-2xl font-bold text-orange-600">
            {equipment.filter(e => e.status === "PENDING_INSPECTION").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold">R {totalValue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, brand, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  {equipment.length === 0 ? "No equipment yet. Add your first item!" : "No equipment matches your filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.brand} {item.model}</p>
                    </div>
                  </TableCell>
                  <TableCell>{categories.find(c => c.value === item.category)?.label || item.category}</TableCell>
                  <TableCell>{conditions.find(c => c.value === item.condition)?.label || item.condition}</TableCell>
                  <TableCell>
                    <Badge variant={item.acquisitionType === "CONSIGNMENT" ? "warning" : "default"}>
                      {acquisitionTypes.find(a => a.value === item.acquisitionType)?.label || item.acquisitionType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(item.status)}>
                      {statuses.find(s => s.value === item.status)?.label || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>R {item.sellingPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openViewModal(item)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(item)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteModal(item)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="text-sm text-gray-500">
        Showing {filteredEquipment.length} of {equipment.length} items
      </div>

      {/* Add Equipment Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Equipment" size="xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Equipment Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Canon EOS R5"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                placeholder="e.g. Canon, Sony, Nikon"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                placeholder="e.g. EOS R5"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                placeholder="Serial number if available"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                {conditions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisitionType">Acquisition Type</Label>
              <Select
                value={formData.acquisitionType}
                onChange={(e) => setFormData({ ...formData, acquisitionType: e.target.value })}
              >
                {acquisitionTypes.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Client</Label>
              <Select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              >
                <option value="">Select vendor (optional)</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price (R)</Label>
              <Input
                id="purchasePrice"
                type="number"
                placeholder="What you paid"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (R) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                placeholder="Listed price"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              />
            </div>
            {formData.acquisitionType === "CONSIGNMENT" && (
              <div className="space-y-2">
                <Label htmlFor="consignmentRate">Consignment % (Vendor gets)</Label>
                <Input
                  id="consignmentRate"
                  type="number"
                  placeholder="70"
                  value={formData.consignmentRate}
                  onChange={(e) => setFormData({ ...formData, consignmentRate: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Shelf A-12, Storefront"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this equipment..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!formData.name || !formData.brand || !formData.model || !formData.sellingPrice || saving}>
              {saving ? "Adding..." : "Add Equipment"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Equipment Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Equipment" size="xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Equipment Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand *</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}>
                {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Acquisition Type</Label>
              <Select value={formData.acquisitionType} onChange={(e) => setFormData({ ...formData, acquisitionType: e.target.value })}>
                {acquisitionTypes.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendor/Client</Label>
              <Select value={formData.vendorId} onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}>
                <option value="">No vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Purchase Price (R)</Label>
              <Input type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Selling Price (R) *</Label>
              <Input type="number" value={formData.sellingPrice} onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} />
            </div>
            {formData.acquisitionType === "CONSIGNMENT" && (
              <div className="space-y-2">
                <Label>Consignment %</Label>
                <Input type="number" value={formData.consignmentRate} onChange={(e) => setFormData({ ...formData, consignmentRate: e.target.value })} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!formData.name || !formData.brand || !formData.model || !formData.sellingPrice || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Equipment Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Equipment Details" size="lg">
        {selectedEquipment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{selectedEquipment.name}</p>
                <p className="text-gray-500">{selectedEquipment.brand} {selectedEquipment.model}</p>
              </div>
              <Badge variant={getStatusColor(selectedEquipment.status)}>
                {statuses.find(s => s.value === selectedEquipment.status)?.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-mono font-medium">{selectedEquipment.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Serial Number</p>
                <p className="font-medium">{selectedEquipment.serialNumber || "N/A"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{categories.find(c => c.value === selectedEquipment.category)?.label}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Condition</p>
                <p className="font-medium">{conditions.find(c => c.value === selectedEquipment.condition)?.label}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{selectedEquipment.location || "Not set"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Acquisition Type</p>
                <Badge variant={selectedEquipment.acquisitionType === "CONSIGNMENT" ? "warning" : "default"}>
                  {acquisitionTypes.find(a => a.value === selectedEquipment.acquisitionType)?.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium">{selectedEquipment.vendor?.name || "No vendor"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Purchase Price</p>
                <p className="font-medium">
                  {selectedEquipment.purchasePrice ? `R ${selectedEquipment.purchasePrice.toLocaleString()}` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selling Price</p>
                <p className="font-medium text-green-600">R {selectedEquipment.sellingPrice.toLocaleString()}</p>
              </div>
              {selectedEquipment.acquisitionType === "CONSIGNMENT" && (
                <div>
                  <p className="text-sm text-gray-500">Consignment Rate</p>
                  <p className="font-medium">{selectedEquipment.consignmentRate}%</p>
                </div>
              )}
            </div>

            {selectedEquipment.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-1">{selectedEquipment.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-gray-500">
              <div>Added: {new Date(selectedEquipment.createdAt).toLocaleString()}</div>
              <div>Acquired: {new Date(selectedEquipment.acquiredAt).toLocaleDateString()}</div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
              <Button onClick={() => { setShowViewModal(false); openEditModal(selectedEquipment); }}>
                Edit Equipment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Equipment" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedEquipment?.name}</strong>?
            This action cannot be undone.
          </p>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm"><strong>SKU:</strong> {selectedEquipment?.sku}</p>
            <p className="text-sm"><strong>Value:</strong> R {selectedEquipment?.sellingPrice.toLocaleString()}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Equipment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
