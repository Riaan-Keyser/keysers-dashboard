"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Wrench, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"

interface Equipment {
  id: string
  sku: string
  name: string
  brand: string
  model: string
}

interface RepairLog {
  id: string
  equipment: Equipment
  equipmentId: string
  technicianName: string
  issue: string
  notes: string | null
  estimatedCost: number | null
  actualCost: number | null
  status: string
  sentAt: string
  completedAt: string | null
}

interface ItemRequiringRepair {
  id: string
  clientName: string
  verifiedItem: {
    product: {
      id: string
      name: string
      brand: string
      model: string
    }
    serialNumber: string | null
  }
  session: {
    purchase: {
      id: string
      customerName: string
    }
    vendor: {
      id: string
      name: string
    }
  }
}

const repairStatuses = [
  { value: "SENT_TO_TECH", label: "Sent to Technician" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" }
]

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<RepairLog[]>([])
  const [itemsRequiringRepair, setItemsRequiringRepair] = useState<ItemRequiringRepair[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [activeTab, setActiveTab] = useState<"repairs" | "requiring_repair">("repairs")

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedRepair, setSelectedRepair] = useState<RepairLog | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    equipmentId: "",
    technicianName: "",
    issue: "",
    notes: "",
    estimatedCost: ""
  })

  const [updateData, setUpdateData] = useState({
    status: "",
    notes: "",
    actualCost: ""
  })

  useEffect(() => {
    fetchRepairs()
    fetchEquipment()
  }, [])

  const fetchRepairs = async () => {
    try {
      const response = await fetch("/api/repairs")
      const data = await response.json()
      
      // Handle new API response format (object with repairs and itemsRequiringRepair)
      // or old format (array of repairs)
      if (Array.isArray(data)) {
        // Old format: array of repairs
        setRepairs(data)
        setItemsRequiringRepair([])
      } else {
        // New format: object with repairs and itemsRequiringRepair
        setRepairs(data.repairs || [])
        setItemsRequiringRepair(data.itemsRequiringRepair || [])
      }
    } catch (error) {
      console.error("Failed to fetch repairs:", error)
      setRepairs([])
      setItemsRequiringRepair([])
    } finally {
      setLoading(false)
    }
  }

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment")
      const data = await response.json()
      // Only show equipment not already in repair
      setEquipment(data.filter((e: any) => e.status !== "IN_REPAIR"))
    } catch (error) {
      console.error("Failed to fetch equipment:", error)
    }
  }

  const handleSendToRepair = async () => {
    setSaving(true)
    try {
      const payload = {
        equipmentId: formData.equipmentId,
        technicianName: formData.technicianName,
        issue: formData.issue,
        notes: formData.notes || null,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null
      }

      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowAddModal(false)
        setFormData({ equipmentId: "", technicianName: "", issue: "", notes: "", estimatedCost: "" })
        fetchRepairs()
        fetchEquipment()
      }
    } catch (error) {
      console.error("Failed to create repair:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRepair = async () => {
    if (!selectedRepair) return
    setSaving(true)
    try {
      const payload = {
        status: updateData.status,
        notes: updateData.notes || selectedRepair.notes,
        actualCost: updateData.actualCost ? parseFloat(updateData.actualCost) : selectedRepair.actualCost,
        completedAt: ["COMPLETED", "RETURNED"].includes(updateData.status) ? new Date().toISOString() : null
      }

      const response = await fetch(`/api/repairs/${selectedRepair.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowUpdateModal(false)
        setSelectedRepair(null)
        fetchRepairs()
        fetchEquipment()
      }
    } catch (error) {
      console.error("Failed to update repair:", error)
    } finally {
      setSaving(false)
    }
  }

  const openUpdateModal = (repair: RepairLog) => {
    setSelectedRepair(repair)
    setUpdateData({
      status: repair.status,
      notes: repair.notes || "",
      actualCost: repair.actualCost?.toString() || ""
    })
    setShowUpdateModal(true)
  }

  const getStatusColor = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    const colors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      SENT_TO_TECH: "warning",
      IN_PROGRESS: "info",
      COMPLETED: "success",
      RETURNED: "success",
      CANCELLED: "danger"
    }
    return colors[status] || "default"
  }

  const getDaysInRepair = (sentAt: string, completedAt: string | null) => {
    const start = new Date(sentAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const filteredRepairs = repairs.filter(repair => {
    const matchesSearch = repair.equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.equipment.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || repair.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading repairs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repair Management</h1>
          <p className="text-gray-500 mt-1">Track equipment sent to technicians for repairs</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Send to Repair
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Wrench className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">With Technician</p>
              <p className="text-2xl font-bold">
                {repairs.filter(r => r.status === "SENT_TO_TECH").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">
            {repairs.filter(r => r.status === "IN_PROGRESS").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Requiring Repair (Paid)</p>
          <p className="text-2xl font-bold text-red-600">
            {itemsRequiringRepair.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Repair Costs</p>
          <p className="text-2xl font-bold">
            R {repairs.reduce((sum, r) => sum + (r.actualCost || 0), 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("repairs")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "repairs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Active Repairs ({repairs.length})
        </button>
        <button
          onClick={() => setActiveTab("requiring_repair")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors relative ${
            activeTab === "requiring_repair"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Requiring Repair ({itemsRequiringRepair.length})
          {itemsRequiringRepair.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {itemsRequiringRepair.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters - Only for Active Repairs */}
      {activeTab === "repairs" && (
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by equipment or technician..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              {repairStatuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {/* Active Repairs Table */}
      {activeTab === "repairs" && (
        <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Est. Cost</TableHead>
              <TableHead>Actual Cost</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRepairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  {repairs.length === 0 ? "No repair records yet" : "No repairs match your filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredRepairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{repair.equipment.name}</p>
                      <p className="text-sm text-gray-500">
                        {repair.equipment.brand} {repair.equipment.model}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{repair.equipment.sku}</TableCell>
                  <TableCell>{repair.technicianName}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{repair.issue}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(repair.status)}>
                      {repairStatuses.find(s => s.value === repair.status)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={getDaysInRepair(repair.sentAt, repair.completedAt) > 14 ? "text-red-600 font-medium" : ""}>
                      {getDaysInRepair(repair.sentAt, repair.completedAt)} days
                    </span>
                  </TableCell>
                  <TableCell>
                    {repair.estimatedCost ? `R ${repair.estimatedCost.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    {repair.actualCost ? `R ${repair.actualCost.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openUpdateModal(repair)}
                      disabled={["RETURNED", "CANCELLED"].includes(repair.status)}
                    >
                      Update Status
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      )}

      {/* Items Requiring Repair Table */}
      {activeTab === "requiring_repair" && (
        <Card>
          {itemsRequiringRepair.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No items requiring repair</p>
              <p className="text-sm mt-2">Items marked for repair during inspection will appear here after payment is completed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendor/Client</TableHead>
                  <TableHead>Purchase ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsRequiringRepair.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.verifiedItem.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.verifiedItem.product.brand} {item.verifiedItem.product.model}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.verifiedItem.serialNumber || "-"}
                    </TableCell>
                    <TableCell>{item.session.purchase.customerName}</TableCell>
                    <TableCell>{item.session.vendor.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.session.purchase.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-red-100 text-red-800">
                        Awaiting Repair Setup
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Send to Repair Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Send Equipment to Repair" size="lg">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment *</Label>
            <Select
              value={formData.equipmentId}
              onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
            >
              <option value="">Select equipment to repair</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.sku} - {e.name} ({e.brand})</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technicianName">Technician Name *</Label>
            <Input
              id="technicianName"
              placeholder="Name of the technician"
              value={formData.technicianName}
              onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue">Issue/Problem *</Label>
            <Textarea
              id="issue"
              placeholder="Describe the issue that needs to be repaired..."
              value={formData.issue}
              onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost (R)</Label>
            <Input
              id="estimatedCost"
              type="number"
              placeholder="Estimated repair cost"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendToRepair} 
              disabled={!formData.equipmentId || !formData.technicianName || !formData.issue || saving}
            >
              {saving ? "Sending..." : "Send to Repair"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Repair Modal */}
      <Modal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} title="Update Repair Status" size="md">
        {selectedRepair && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">{selectedRepair.equipment.name}</p>
              <p className="text-sm text-gray-500">{selectedRepair.equipment.sku}</p>
              <p className="text-sm mt-2"><strong>Issue:</strong> {selectedRepair.issue}</p>
            </div>

            <div className="space-y-2">
              <Label>Update Status *</Label>
              <Select
                value={updateData.status}
                onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
              >
                {repairStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actual Cost (R)</Label>
              <Input
                type="number"
                placeholder="Final repair cost"
                value={updateData.actualCost}
                onChange={(e) => setUpdateData({ ...updateData, actualCost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Update notes..."
                value={updateData.notes}
                onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
              />
            </div>

            {["COMPLETED", "RETURNED"].includes(updateData.status) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span>This will mark the repair as complete and update the equipment status.</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowUpdateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRepair} disabled={saving}>
                {saving ? "Updating..." : "Update Repair"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
