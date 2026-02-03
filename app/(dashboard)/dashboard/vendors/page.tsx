"use client"

import React, { useEffect, useState } from "react"
import { Plus, Search, Mail, Phone, Edit, Trash2, Eye, ChevronDown, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"

interface Equipment {
  id: string
  sku: string
  name: string
  brand: string
  model: string
  category: string
  condition: string
  sellingPrice: number
  purchasePrice: number | null
  status: string
  acquisitionType: string
  acquiredAt: string
}

interface Vendor {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  trustScore: number
  createdAt: string
  equipmentCount?: number
  equipment?: Equipment[]
}

const emptyVendor = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  trustScore: 50
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set())
  const [loadingEquipment, setLoadingEquipment] = useState<Set<string>>(new Set())
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState(emptyVendor)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors")
      const data = await response.json()
      // Ensure data is an array
      setVendors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch vendors:", error)
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVendorEquipment = async (vendorId: string) => {
    setLoadingEquipment(prev => new Set(prev).add(vendorId))
    try {
      const response = await fetch(`/api/vendors/${vendorId}`)
      const data = await response.json()
      
      setVendors(prev => prev.map(v => 
        v.id === vendorId ? { ...v, equipment: data.equipment } : v
      ))
    } catch (error) {
      console.error("Failed to fetch vendor equipment:", error)
    } finally {
      setLoadingEquipment(prev => {
        const newSet = new Set(prev)
        newSet.delete(vendorId)
        return newSet
      })
    }
  }

  const toggleExpand = async (vendorId: string) => {
    const newExpanded = new Set(expandedVendors)
    
    if (newExpanded.has(vendorId)) {
      newExpanded.delete(vendorId)
    } else {
      newExpanded.add(vendorId)
      const vendor = vendors.find(v => v.id === vendorId)
      if (vendor && !vendor.equipment) {
        await fetchVendorEquipment(vendorId)
      }
    }
    
    setExpandedVendors(newExpanded)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setShowAddModal(false)
        setFormData(emptyVendor)
        fetchVendors()
      }
    } catch (error) {
      console.error("Failed to add vendor:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedVendor) return
    setSaving(true)
    try {
      const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setShowEditModal(false)
        setSelectedVendor(null)
        setFormData(emptyVendor)
        fetchVendors()
      }
    } catch (error) {
      console.error("Failed to update vendor:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedVendor) return
    setSaving(true)
    try {
      const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
        method: "DELETE"
      })
      
      if (response.ok) {
        setShowDeleteModal(false)
        setSelectedVendor(null)
        fetchVendors()
      }
    } catch (error) {
      console.error("Failed to delete vendor:", error)
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setFormData({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
      trustScore: vendor.trustScore
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setShowDeleteModal(true)
  }

  const getTrustScoreColor = (score: number): "default" | "success" | "warning" | "danger" => {
    if (score >= 80) return "success"
    if (score >= 50) return "warning"
    return "danger"
  }

  const getStatusColor = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    const colors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      PENDING_INSPECTION: "warning",
      READY_FOR_SALE: "success",
      SOLD: "default",
      IN_REPAIR: "warning"
    }
    return colors[status] || "default"
  }

  const filteredVendors = searchTerm
    ? vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.phone?.includes(searchTerm)
      )
    : vendors

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors & Clients</h1>
          <p className="text-gray-500 mt-1">Manage people who sell equipment to you</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Vendors</p>
          <p className="text-2xl font-bold">{vendors.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">High Trust (80+)</p>
          <p className="text-2xl font-bold text-green-600">
            {vendors.filter(v => v.trustScore >= 80).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Equipment</p>
          <p className="text-2xl font-bold text-blue-600">
            {vendors.reduce((sum, v) => sum + (v.equipmentCount || 0), 0)}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vendors by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Vendor List - Same layout as Incoming Gear */}
      <div className="space-y-3">
        {filteredVendors.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {vendors.length === 0 ? "No vendors yet. Add your first vendor!" : "No vendors match your search"}
            </p>
          </Card>
        ) : (
          filteredVendors.map((vendor) => {
            const isExpanded = expandedVendors.has(vendor.id)
            
            return (
              <Card key={vendor.id} className="overflow-hidden">
                {/* Vendor Header */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleExpand(vendor.id)}
                    className="flex items-center gap-4 flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {vendor.phone && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </span>
                        )}
                        {vendor.email && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {vendor.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{vendor.equipmentCount || 0} items</p>
                      <Badge variant={getTrustScoreColor(vendor.trustScore)}>
                        Trust: {vendor.trustScore}/100
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(vendor)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteModal(vendor)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Equipment - Same style as Incoming Gear */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-6">
                    {loadingEquipment.has(vendor.id) ? (
                      <div className="flex items-center gap-2 text-gray-500 justify-center py-8">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        Loading equipment...
                      </div>
                    ) : vendor.equipment && vendor.equipment.length > 0 ? (
                      <div className="space-y-3">
                        {vendor.equipment.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg border p-3">
                            {/* Everything on ONE line - Product LEFT, all others CENTER */}
                            <div className="flex items-center gap-2 text-sm w-full">
                              <span className="font-mono text-xs text-gray-500 w-[8%] text-center">{item.sku}</span>
                              <span className="text-gray-400">|</span>
                              <span className="font-medium text-gray-900 w-[22%] text-left truncate">{item.name} ({item.brand} {item.model})</span>
                              <span className="text-gray-400">|</span>
                              <div className="w-[12%] flex justify-center">
                                <Badge variant={getStatusColor(item.status)} className="text-xs whitespace-nowrap">
                                  {item.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-700 w-[8%] text-center">{item.condition}</span>
                              <span className="text-gray-400">|</span>
                              <div className="w-[12%] flex justify-center">
                                <Badge variant={item.acquisitionType === "CONSIGNMENT" ? "warning" : "default"} className="text-xs whitespace-nowrap">
                                  {item.acquisitionType === "CONSIGNMENT" ? "Consignment" : "Purchased"}
                                </Badge>
                              </div>
                              <span className="text-gray-400">|</span>
                              <span className="font-medium text-green-600 w-[10%] text-center">
                                {item.purchasePrice ? `R ${Number(item.purchasePrice).toLocaleString()}` : "-"}
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="font-medium text-blue-600 w-[10%] text-center">
                                R {Number(item.sellingPrice).toLocaleString()}
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="text-xs text-gray-500 w-[8%] text-center">
                                {new Date(item.acquiredAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No equipment from this vendor</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Add Vendor Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Vendor" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Vendor name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+27 82 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vendor@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Full address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="trustScore">Trust Score: {formData.trustScore}</Label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.trustScore}
              onChange={(e) => setFormData({ ...formData, trustScore: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low (0)</span>
              <span>Medium (50)</span>
              <span>High (100)</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this vendor..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!formData.name || saving}>
              {saving ? "Adding..." : "Add Vendor"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Vendor Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Vendor" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Trust Score: {formData.trustScore}</Label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.trustScore}
              onChange={(e) => setFormData({ ...formData, trustScore: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Vendor" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedVendor?.name}</strong>? 
            This action cannot be undone.
          </p>
          
          {selectedVendor && (selectedVendor.equipmentCount || 0) > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ This vendor has {selectedVendor.equipmentCount} equipment items associated with them.
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Vendor"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
