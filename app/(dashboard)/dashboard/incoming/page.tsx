"use client"

import React, { useEffect, useState } from "react"
import { PackagePlus, ChevronDown, ChevronRight, Check, X, Edit, DollarSign, ZoomIn, Trash2, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Lightbox } from "@/components/ui/lightbox"

interface PendingItem {
  id: string
  name: string
  brand: string | null
  model: string | null
  category: string | null
  condition: string | null
  description: string | null
  botEstimatedPrice: number | null
  proposedPrice: number | null
  finalPrice: number | null
  suggestedSellPrice: number | null
  status: string
  imageUrls: string[]
}

interface PendingPurchase {
  id: string
  customerName: string
  customerPhone: string
  whatsappConversationId: string | null
  totalQuoteAmount: number | null
  status: string
  botQuoteAcceptedAt: string | null
  createdAt: string
  items: PendingItem[]
  vendor: { id: string; name: string } | null
}

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Check if it's a South African number
  if (cleaned.startsWith('+27') || cleaned.startsWith('27')) {
    const number = cleaned.startsWith('+') ? cleaned.slice(3) : cleaned.slice(2)
    
    // Format as +27 XX XXX XXXX
    if (number.length === 9) {
      return `+27 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`
    }
  }
  
  // Return original if not matching expected format
  return phone
}

const formatPrice = (price: number | null): string => {
  if (!price) return "-"
  
  // Format number with space as thousands separator (South African format)
  const rounded = Math.round(price)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  
  return `R${formatted}`
}

export default function IncomingGearPage() {
  const [purchases, setPurchases] = useState<PendingPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState("ALL")
  
  // Edit modal state
  const [editingItem, setEditingItem] = useState<PendingItem | null>(null)
  const [editPrices, setEditPrices] = useState({
    proposedPrice: "",
    finalPrice: "",
    suggestedSellPrice: "",
    reviewNotes: ""
  })
  const [saving, setSaving] = useState(false)
  
  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)

  useEffect(() => {
    fetchPurchases()
  }, [statusFilter])

  const fetchPurchases = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/incoming-gear?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setPurchases(data)
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (purchaseId: string) => {
    // Only allow one client expanded at a time (accordion behavior)
    if (expandedPurchases.has(purchaseId)) {
      // Collapse if clicking on already expanded
      setExpandedPurchases(new Set())
    } else {
      // Expand this one, collapse all others
      setExpandedPurchases(new Set([purchaseId]))
    }
  }

  const openEditModal = (item: PendingItem) => {
    setEditingItem(item)
    setEditPrices({
      proposedPrice: item.proposedPrice?.toString() || "",
      finalPrice: item.finalPrice?.toString() || "",
      suggestedSellPrice: item.suggestedSellPrice?.toString() || "",
      reviewNotes: ""
    })
  }

  const handleSavePrices = async () => {
    if (!editingItem) return
    setSaving(true)
    try {
      const response = await fetch(`/api/incoming-gear/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedPrice: editPrices.proposedPrice ? parseFloat(editPrices.proposedPrice) : null,
          finalPrice: editPrices.finalPrice ? parseFloat(editPrices.finalPrice) : null,
          suggestedSellPrice: editPrices.suggestedSellPrice ? parseFloat(editPrices.suggestedSellPrice) : null,
          status: "PRICE_ADJUSTED",
          reviewNotes: editPrices.reviewNotes
        })
      })

      if (response.ok) {
        setEditingItem(null)
        fetchPurchases()
      }
    } catch (error) {
      console.error("Failed to save prices:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleApproveItem = async (itemId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      await fetch(`/api/incoming-gear/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" })
      })
      fetchPurchases()
    } catch (error) {
      console.error("Failed to approve item:", error)
    }
  }

  const handleRejectItem = async (itemId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      await fetch(`/api/incoming-gear/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" })
      })
      fetchPurchases()
    } catch (error) {
      console.error("Failed to reject item:", error)
    }
  }

  const handleDeletePurchase = async (purchaseId: string, customerName: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete all items for ${customerName}?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        fetchPurchases()
      } else {
        alert("Failed to delete purchase")
      }
    } catch (error) {
      console.error("Failed to delete purchase:", error)
      alert("Failed to delete purchase")
    }
  }

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  const handleApprovePurchase = async (purchaseId: string) => {
    if (!confirm("This will generate a supplier invoice and send it to the client for acceptance. Continue?")) return

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/approve-for-payment`, {
        method: "POST"
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Invoice ${data.invoiceNumber} generated!\n\nEmail sent to client with Accept/Decline buttons.\n\nOnce client accepts and submits details, it will appear in Awaiting Payment.`)
        fetchPurchases()
      }
    } catch (error) {
      console.error("Failed to approve:", error)
      alert("Failed to generate invoice")
    }
  }

  const getStatusColor = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    const colors: Record<string, any> = {
      PENDING_REVIEW: "warning",
      IN_REVIEW: "info",
      PENDING_APPROVAL: "warning",
      APPROVED: "success",
      ADDED_TO_INVENTORY: "success",
      REJECTED: "danger",
      CANCELLED: "default"
    }
    return colors[status] || "default"
  }

  const getItemStatusColor = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    const colors: Record<string, any> = {
      PENDING: "warning",
      APPROVED: "success",
      REJECTED: "danger",
      PRICE_ADJUSTED: "info",
      ADDED_TO_INVENTORY: "success"
    }
    return colors[status] || "default"
  }

  const pendingCount = purchases.filter(p => p.status === "PENDING_REVIEW").length
  const approvedCount = purchases.filter(p => p.status === "APPROVED").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading incoming gear...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incoming Gear</h1>
          <p className="text-gray-500 mt-1">Review and approve equipment from customers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <PackagePlus className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Ready to Add</p>
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold">
            {purchases.reduce((sum, p) => sum + p.items.length, 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold">
            {formatPrice(purchases.reduce((sum, p) => sum + (p.totalQuoteAmount || 0), 0))}
          </p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Awaiting Client Feedback</option>
          <option value="PENDING_APPROVAL">Client Details Submitted</option>
          <option value="ADDED_TO_INVENTORY">Completed</option>
        </Select>
      </Card>

      {/* Purchase List */}
      <div className="space-y-3">
        {purchases.length === 0 ? (
          <Card className="p-12 text-center">
            <PackagePlus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No incoming gear to review</p>
          </Card>
        ) : (
          purchases.map((purchase) => {
            const isExpanded = expandedPurchases.has(purchase.id)
            const approvedItems = purchase.items.filter(i => i.status === "APPROVED" || i.status === "PRICE_ADJUSTED").length
            
            return (
              <Card key={purchase.id} className="overflow-hidden">
                {/* Purchase Header */}
                <div className="w-full p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(purchase.id)}
                      className="flex items-center gap-4 flex-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{purchase.customerName}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{formatPhoneNumber(purchase.customerPhone)}</span>
                          </div>
                          {purchase.customerEmail && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{purchase.customerEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{purchase.items.length} items</p>
                        {purchase.totalQuoteAmount && (
                          <p className="text-sm text-gray-500">{formatPrice(purchase.totalQuoteAmount)}</p>
                        )}
                      </div>
                      <Badge variant={getStatusColor(purchase.status)}>
                        {purchase.status === "APPROVED" ? "Awaiting Client" : 
                         purchase.status === "PENDING_APPROVAL" ? "Client Accepted" :
                         purchase.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDeletePurchase(purchase.id, purchase.customerName, e)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete this customer and all their items"
                      >
                        <X className="h-5 w-5 text-red-600 hover:text-red-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Items */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-3">
                    {/* Column Headers */}
                    <div className="grid grid-cols-[minmax(500px,1fr)_110px_110px_110px_110px_110px_80px_minmax(280px,1fr)] gap-x-16 mb-3">
                      <div className="justify-self-start"></div> {/* Empty for product name column */}
                      <div className="text-center"></div> {/* Empty for status column */}
                      <div className="text-sm text-gray-500 font-medium text-center w-full">Buy Low</div>
                      <div className="text-sm text-gray-500 font-medium text-center w-full">Buy High</div>
                      <div className="text-sm text-gray-500 font-medium text-center whitespace-nowrap w-full">Consignment Low</div>
                      <div className="text-sm text-gray-500 font-medium text-center whitespace-nowrap w-full">Consignment High</div>
                      <div className="text-center"></div> {/* Empty for image column */}
                      <div className="justify-self-end"></div> {/* Empty for actions column */}
                    </div>

                    <div className="space-y-3">
                      {purchase.items.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border p-2 pr-2">
                          <div className="grid grid-cols-[minmax(500px,1fr)_110px_110px_110px_110px_110px_80px_minmax(280px,1fr)] gap-x-16 items-center">
                            {/* Product Name */}
                            <div className="min-w-0 justify-self-start">
                              <h4 className="font-medium text-gray-900 break-words">{item.name}</h4>
                            </div>

                            {/* Status */}
                            <div className="flex items-center">
                              <Badge variant={getItemStatusColor(item.status)} className="flex-shrink-0">
                                {item.status.replace(/_/g, " ")}
                              </Badge>
                            </div>

                            {/* Buy Low */}
                            <div className="flex items-center justify-center">
                              <p className="font-medium text-sm whitespace-nowrap">
                                {formatPrice(item.botEstimatedPrice)}
                              </p>
                            </div>

                            {/* Buy High */}
                            <div className="flex items-center justify-center">
                              <p className="font-medium text-sm whitespace-nowrap">
                                {formatPrice(item.suggestedSellPrice)}
                              </p>
                            </div>

                            {/* Consignment Low */}
                            <div className="flex items-center justify-center">
                              <p className="font-medium text-sm text-orange-600 whitespace-nowrap">
                                {item.proposedPrice ? formatPrice(item.proposedPrice * 0.7) : "-"}
                              </p>
                            </div>

                            {/* Consignment High */}
                            <div className="flex items-center justify-center">
                              <p className="font-medium text-sm text-orange-600 whitespace-nowrap">
                                {item.suggestedSellPrice ? formatPrice(item.suggestedSellPrice * 0.7) : "-"}
                              </p>
                            </div>

                            {/* Image - clickable for lightbox */}
                            <div className="flex items-center">
                              {item.imageUrls.length > 0 ? (
                                <button
                                  onClick={() => openLightbox(item.imageUrls, 0)}
                                  className="relative h-12 w-12 flex-shrink-0 group"
                                >
                                  <img
                                    src={item.imageUrls[0]}
                                    alt={item.name}
                                    className="h-full w-full object-cover rounded border group-hover:opacity-75 transition-opacity"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
                                    <ZoomIn className="h-4 w-4 text-white drop-shadow-lg" />
                                  </div>
                                  {item.imageUrls.length > 1 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                                      {item.imageUrls.length}
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <div className="h-12 w-12 flex-shrink-0 bg-gray-100 rounded border flex items-center justify-center">
                                  <span className="text-xs text-gray-400">No image</span>
                                </div>
                              )}
                            </div>

                            {/* Actions - Edit button anchored to far right */}
                            <div className="flex gap-2 w-full pr-0 justify-self-end">
                              {item.status === "PENDING" || item.status === "PRICE_ADJUSTED" ? (
                                <>
                                  <Button size="sm" onClick={(e) => handleApproveItem(item.id, e)} className="bg-green-600 hover:bg-green-700">
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={(e) => handleRejectItem(item.id, e)}>
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              ) : null}
                              <div className="flex-1"></div>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="mr-0">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Supplier Invoice Summary */}
                      {approvedItems > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <h4 className="font-semibold text-blue-900 mb-2">Supplier Invoice</h4>
                          <div className="space-y-1 text-sm">
                            {purchase.items.filter(i => i.status === "APPROVED" || i.status === "PRICE_ADJUSTED").map(item => (
                              <div key={item.id} className="flex justify-between">
                                <span className="text-blue-700">{item.name}</span>
                                <span className="font-medium text-blue-900">
                                  {formatPrice(item.finalPrice || item.proposedPrice || 0)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-2 border-t border-blue-300">
                              <span className="font-bold text-blue-900">TOTAL</span>
                              <span className="font-bold text-blue-900 text-lg">
                                {formatPrice(purchase.items
                                  .filter(i => i.status === "APPROVED" || i.status === "PRICE_ADJUSTED")
                                  .reduce((sum, i) => sum + (i.finalPrice || i.proposedPrice || 0), 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Purchase Actions */}
                      {approvedItems > 0 && purchase.status === "PENDING_REVIEW" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-green-800">
                                {approvedItems} of {purchase.items.length} items approved
                              </p>
                              <p className="text-sm text-green-600">Ready to send to client for acceptance</p>
                            </div>
                            <Button
                              onClick={() => handleApprovePurchase(purchase.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Approve for Payment
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {purchase.invoiceNumber && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-yellow-800">
                                📧 Invoice <strong>{purchase.invoiceNumber}</strong> sent to client
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                Sent to: {purchase.customerEmail || "No email"} • Awaiting client acceptance
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovePurchase(purchase.id)}
                              className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                            >
                              📧 Resend to Client
                            </Button>
                          </div>
                        </div>
                      )}

                      {purchase.status === "ADDED_TO_INVENTORY" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                          ✅ This purchase has been added to inventory
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Image Lightbox */}
      {showLightbox && (
        <Lightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}

      {/* Edit Prices Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Adjust Pricing"
        size="md"
      >
        {editingItem && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">{editingItem.name}</h4>
              <p className="text-sm text-gray-500">
                {editingItem.brand} {editingItem.model}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Proposed Purchase Price (R)</Label>
              <Input
                type="number"
                placeholder={editingItem.botEstimatedPrice?.toString()}
                value={editPrices.proposedPrice}
                onChange={(e) => setEditPrices({ ...editPrices, proposedPrice: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Bot estimated: R {editingItem.botEstimatedPrice?.toLocaleString() || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Final Price (R)</Label>
              <Input
                type="number"
                value={editPrices.finalPrice}
                onChange={(e) => setEditPrices({ ...editPrices, finalPrice: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Suggested Selling Price (R)</Label>
              <Input
                type="number"
                value={editPrices.suggestedSellPrice}
                onChange={(e) => setEditPrices({ ...editPrices, suggestedSellPrice: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                This will be the listing price when added to inventory
              </p>
            </div>

            <div className="space-y-2">
              <Label>Review Notes</Label>
              <Textarea
                placeholder="Any notes about this item..."
                value={editPrices.reviewNotes}
                onChange={(e) => setEditPrices({ ...editPrices, reviewNotes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleSavePrices} disabled={saving}>
                {saving ? "Saving..." : "Save & Mark Adjusted"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
