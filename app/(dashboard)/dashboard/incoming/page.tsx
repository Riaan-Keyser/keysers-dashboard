"use client"

import React, { useEffect, useState } from "react"
import { PackagePlus, ChevronDown, ChevronRight, Check, X, Edit, DollarSign, ZoomIn, Trash2, Phone, Mail, Send, Package, Truck, CheckCircle, ClipboardCheck, ArrowRight, Loader2, RefreshCw, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Lightbox } from "@/components/ui/lightbox"
import { InspectItemModal } from "@/components/inspection/InspectItemModal"

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
  customerEmail: string | null
  whatsappConversationId: string | null
  totalQuoteAmount: number | null
  status: string
  botQuoteAcceptedAt: string | null
  createdAt: string
  items: PendingItem[]
  vendor: { id: string; name: string } | null
  // Sprint 1: Shipping & Tracking
  courierCompany: string | null
  trackingNumber: string | null
  gearReceivedAt: string | null
  gearReceivedBy: { name: string } | null
  clientNotifiedAt: string | null
  // Sprint 2: Inspection Integration
  inspectionSessionId: string | null
  inspectionSession: {
    id: string
    sessionName: string
    status: string
    createdAt: string
    createdBy: { id: string; name: string } | null
    incomingItems: {
      id: string
      clientName: string
      inspectionStatus: string
      verifiedItem: {
        locked: boolean
        approvedAt: string | null
        verifiedAt: string | null
      } | null
    }[]
  } | null
  finalQuoteSentAt: string | null
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
  
  // Auto-refresh state
  const [newItemsCount, setNewItemsCount] = useState(0)
  
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
  
  // Quote confirmation modal state
  const [sendingQuote, setSendingQuote] = useState<string | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<PendingPurchase | null>(null)
  const [emailForQuote, setEmailForQuote] = useState("")

  // Sprint 2: Inspection state
  const [startingInspection, setStartingInspection] = useState<string | null>(null)
  const [sendingFinalQuote, setSendingFinalQuote] = useState<string | null>(null)
  const [inspectingItemId, setInspectingItemId] = useState<string | null>(null)
  const [inspectingPurchaseId, setInspectingPurchaseId] = useState<string | null>(null)
  
  // Undo state
  const [undoingReceived, setUndoingReceived] = useState<string | null>(null)
  const [notifyingClient, setNotifyingClient] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    purchaseId?: string
    type: 'purchase' | 'product'
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchPurchases()
  }, [statusFilter])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPurchases(true) // Silent refresh (don't show loading state)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [statusFilter])

  // Update current time every second for countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000) // 1 second

    return () => clearInterval(interval)
  }, [])

  const fetchPurchases = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    
    try {
      const response = await fetch(`/api/incoming-gear?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        
        // Detect new items (only during auto-refresh)
        if (silent && purchases.length > 0) {
          const newItems = data.filter(
            (newPurchase: PendingPurchase) => 
              !purchases.some(existing => existing.id === newPurchase.id)
          )
          
          if (newItems.length > 0) {
            setNewItemsCount(prev => prev + newItems.length)
            console.log(`🔔 ${newItems.length} new purchase(s) detected`)
          }
        }
        
        setPurchases(data)
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleManualRefresh = () => {
    setNewItemsCount(0) // Reset new items indicator
    fetchPurchases()
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
    
    setDeleteTarget({
      id: purchaseId,
      name: customerName,
      type: 'purchase'
    })
    setShowDeleteModal(true)
  }

  const handleDeleteIncomingItem = async (itemId: string, productName: string, purchaseId: string) => {
    setDeleteTarget({
      id: itemId,
      name: productName,
      purchaseId,
      type: 'product'
    })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const url = deleteTarget.type === 'purchase' 
        ? `/api/incoming-gear/${deleteTarget.id}`
        : `/api/incoming-gear/items/${deleteTarget.id}`

      const response = await fetch(url, {
        method: "DELETE"
      })

      if (response.ok) {
        setShowDeleteModal(false)
        setDeleteTarget(null)
        fetchPurchases()
      } else {
        const errorText = await response.text()
        console.error(`Failed to delete ${deleteTarget.type}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: url
        })
        setShowDeleteModal(false)
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error(`Exception while deleting ${deleteTarget.type}:`, error)
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const handleAddProduct = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/incoming-gear/sessions/${sessionId}/add-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: "New Product",
          clientBrand: null,
          clientModel: null,
          clientDescription: null
        })
      })

      if (response.ok) {
        const newItem = await response.json()
        // Navigate to verify page for the new item
        window.location.href = `/dashboard/inspections/${sessionId}/items/${newItem.id}`
      } else {
        console.error("Failed to add product")
      }
    } catch (error) {
      console.error("Failed to add product:", error)
    }
  }

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  const handleSendQuote = (purchase: PendingPurchase) => {
    setSelectedPurchase(purchase)
    setEmailForQuote(purchase.customerPhone || "")  // Use phone for now, or add customerEmail field
    setShowEmailModal(true)
  }

  const confirmSendQuote = async () => {
    if (!selectedPurchase) return
    
    setSendingQuote(selectedPurchase.id)
    try {
      const response = await fetch(`/api/incoming-gear/${selectedPurchase.id}/send-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: emailForQuote })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Failed to send quote")
        return
      }

      alert(`✅ Quote sent successfully to ${emailForQuote}\n\nThe customer will receive an email with a link to review and accept the quote.`)
      setShowEmailModal(false)
      fetchPurchases() // Refresh list
    } catch (error) {
      alert("Failed to send quote. Please try again.")
    } finally {
      setSendingQuote(null)
    }
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

  const handleMarkAsReceived = async (purchaseId: string, customerName: string) => {
    if (!confirm(`Confirm that you have physically received the gear from ${customerName}?\n\nThis will:\n- Update status to "Inspection In Progress"\n- Client will be notified in 10 minutes\n- You can undo this action within 10 minutes`)) {
      return
    }

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/mark-received`, {
        method: "POST"
      })

      if (response.ok) {
        alert(`✅ Gear marked as received!\n\nThe client will be notified in 10 minutes.\n\nYou can undo this action before then if needed.`)
        fetchPurchases()
      } else {
        const data = await response.json()
        alert(`❌ Failed: ${data.error || "Unable to mark as received"}`)
      }
    } catch (error) {
      console.error("Failed to mark as received:", error)
      alert("Failed to mark gear as received")
    }
  }

  const handleUndoReceived = async (purchaseId: string, customerName: string) => {
    if (!confirm(`Undo "Mark as Received" for ${customerName}?\n\nThis will reset the status and the client will NOT be notified.`)) {
      return
    }

    setUndoingReceived(purchaseId)

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/undo-received`, {
        method: "POST"
      })

      if (response.ok) {
        alert(`✅ Action undone successfully!\n\nStatus reset for ${customerName}.`)
        fetchPurchases()
      } else {
        const data = await response.json()
        alert(`❌ Failed: ${data.error || "Unable to undo"}`)
      }
    } catch (error) {
      console.error("Failed to undo:", error)
      alert("Failed to undo action")
    } finally {
      setUndoingReceived(null)
    }
  }

  const handleNotifyClient = async (purchaseId: string, customerName: string) => {
    setNotifyingClient(purchaseId)

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/notify-client`, {
        method: "POST"
      })

      if (response.ok) {
        fetchPurchases()
      } else {
        const data = await response.json()
        console.error(`Failed to notify ${customerName}:`, data.error)
      }
    } catch (error) {
      console.error("Failed to notify client:", error)
    } finally {
      setNotifyingClient(null)
    }
  }

  const getTimeRemaining = (gearReceivedAt: string | null, clientNotifiedAt: string | null) => {
    if (!gearReceivedAt) return null
    if (clientNotifiedAt) return 0 // Already notified
    
    const receivedTime = new Date(gearReceivedAt).getTime()
    const tenMinutes = 10 * 60 * 1000
    const notifyTime = receivedTime + tenMinutes
    const remaining = notifyTime - currentTime
    
    if (remaining <= 0) return 0 // Time expired
    return remaining
  }

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleStartInspection = async (purchaseId: string, customerName: string) => {
    setStartingInspection(purchaseId)

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/start-inspection`, {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect directly to inspection page
        window.location.href = data.redirectUrl
      } else {
        console.error("Failed to start inspection:", data.error)
      }
    } catch (error) {
      console.error("Failed to start inspection:", error)
    } finally {
      setStartingInspection(null)
    }
  }

  const handleSendFinalQuote = async (purchaseId: string, customerName: string, customerEmail: string) => {
    if (!confirm(`Send final quote to ${customerName} (${customerEmail})?\n\nThis will:\n- Email the customer with their final quote\n- Allow them to choose Buy vs Consignment\n- Update status to "Final Quote Sent"`)) {
      return
    }

    setSendingFinalQuote(purchaseId)

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/send-final-quote`, {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Final quote sent successfully!\n\nSent to: ${data.sentTo}\nItems: ${data.itemCount}\n\nThe customer can now review and accept.`)
        fetchPurchases()
      } else {
        alert(`❌ Failed: ${data.error || "Unable to send final quote"}`)
      }
    } catch (error) {
      console.error("Failed to send final quote:", error)
      alert("Failed to send final quote")
    } finally {
      setSendingFinalQuote(null)
    }
  }

  const handleInspectItem = async (purchaseId: string, itemId: string) => {
    setInspectingPurchaseId(purchaseId)
    setInspectingItemId(itemId)
  }

  const getStatusColor = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    const colors: Record<string, any> = {
      PENDING_REVIEW: "warning",
      IN_REVIEW: "info",
      PENDING_APPROVAL: "warning",
      APPROVED: "success",
      ADDED_TO_INVENTORY: "success",
      REJECTED: "danger",
      CANCELLED: "default",
      // Sprint 1: New statuses
      AWAITING_DELIVERY: "info",
      INSPECTION_IN_PROGRESS: "info",
      // Sprint 2: Final quote sent
      FINAL_QUOTE_SENT: "success"
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

  const getInspectionStatus = (purchase: PendingPurchase, itemName: string): "UNVERIFIED" | "VERIFIED" | "IN_PROGRESS" | null => {
    if (!purchase.inspectionSession?.incomingItems) return null
    
    const incomingItem = purchase.inspectionSession.incomingItems.find(
      incoming => incoming.clientName === itemName
    )
    
    return incomingItem?.inspectionStatus || null
  }

  const isItemInspected = (purchase: PendingPurchase, itemName: string): boolean => {
    const status = getInspectionStatus(purchase, itemName)
    return status === "VERIFIED"
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
        
        {/* Refresh controls */}
        <div className="flex items-center gap-3">
          {/* New items indicator */}
          {newItemsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {newItemsCount} new {newItemsCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
          
          {/* Manual refresh button */}
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
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
          <option value="AWAITING_DELIVERY">Awaiting Delivery</option>
          <option value="INSPECTION_IN_PROGRESS">Inspection In Progress</option>
          <option value="FINAL_QUOTE_SENT">Final Quote Sent</option>
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
                    <div className="flex items-center gap-6 ml-auto">
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-medium">{purchase.items.length} items</p>
                        {purchase.totalQuoteAmount && (
                          <p className="text-sm text-gray-500">{formatPrice(purchase.totalQuoteAmount)}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-center min-w-[180px]">
                        <Badge variant={getStatusColor(purchase.status)}>
                          {purchase.status === "APPROVED" ? "Awaiting Client" : 
                           purchase.status === "PENDING_APPROVAL" ? "Client Accepted" :
                           purchase.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400 min-w-[90px] text-center">
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDeletePurchase(purchase.id, purchase.customerName, e)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete this customer and all their items"
                      >
                        <Trash2 className="h-5 w-5 text-red-600 hover:text-red-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Items */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-3">
                    {/* Tracking Info & Mark as Received / Undo / Client Informed */}
                    {(purchase.trackingNumber || (purchase.status === 'AWAITING_DELIVERY' || purchase.status === 'PENDING_REVIEW' || purchase.status === 'INSPECTION_IN_PROGRESS')) && (
                      <div className={`rounded-lg border p-4 mb-4 ${
                        purchase.clientNotifiedAt ? 'bg-green-50 border-green-200' :
                        purchase.gearReceivedAt ? 'bg-yellow-50 border-yellow-200' : 
                        'bg-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            {purchase.trackingNumber ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <Truck className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-gray-500">Courier</p>
                                    <p className="text-sm font-medium text-gray-900">{purchase.courierCompany}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-gray-500">Tracking Number</p>
                                    <p className="text-sm font-medium text-gray-900">{purchase.trackingNumber}</p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    {purchase.gearReceivedAt 
                                      ? `Gear Received (In-person) - by ${purchase.gearReceivedBy?.name || "Staff"}` 
                                      : 'Awaiting Gear Delivery'}
                                  </p>
                                  {!purchase.gearReceivedAt && (
                                    <p className="text-xs text-gray-500">No tracking submitted - client may drop off in person</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Three button states */}
                          {(() => {
                            const timeRemaining = getTimeRemaining(purchase.gearReceivedAt, purchase.clientNotifiedAt)
                            
                            // State 3: Client Informed (after 10 min or notified)
                            if (purchase.clientNotifiedAt) {
                              return (
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-md">
                                  <CheckCircle className="h-4 w-4 text-green-700" />
                                  <span className="text-sm font-medium text-green-700">Client Informed</span>
                                </div>
                              )
                            }
                            
                            // State 2: Undo button (within 10 minutes)
                            if (purchase.gearReceivedAt && timeRemaining !== null && timeRemaining > 0) {
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Notifying in</p>
                                    <p className="text-sm font-mono font-bold text-orange-600">
                                      {formatTimeRemaining(timeRemaining)}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleUndoReceived(purchase.id, purchase.customerName)}
                                    disabled={undoingReceived === purchase.id}
                                    variant="outline"
                                    size="sm"
                                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                                  >
                                    {undoingReceived === purchase.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Undoing...
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-4 w-4 mr-2" />
                                        Undo
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )
                            }
                            
                            // Trigger notification if 10 minutes passed
                            if (purchase.gearReceivedAt && timeRemaining === 0 && !purchase.clientNotifiedAt && notifyingClient !== purchase.id) {
                              // Auto-trigger notification
                              setTimeout(() => handleNotifyClient(purchase.id, purchase.customerName), 100)
                              return (
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-md">
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                                  <span className="text-sm font-medium text-blue-700">Notifying client...</span>
                                </div>
                              )
                            }
                            
                            // State 1: Mark as Received button (initial state)
                            if (!purchase.gearReceivedAt) {
                              return (
                                <Button
                                  onClick={() => handleMarkAsReceived(purchase.id, purchase.customerName)}
                                  variant="outline"
                                  size="sm"
                                  className="border-green-600 text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Received
                                </Button>
                              )
                            }
                            
                            return null
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Sprint 2: Inspection Status & Actions */}
                    {purchase.gearReceivedAt && purchase.status === "INSPECTION_IN_PROGRESS" && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 mb-4">
                        {!purchase.inspectionSessionId ? (
                          // No inspection started yet
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ClipboardCheck className="h-6 w-6 text-blue-600" />
                              <div>
                                <p className="font-semibold text-gray-900">Ready for Inspection</p>
                                <p className="text-sm text-gray-600">Gear received. Click to start verifying items.</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleStartInspection(purchase.id, purchase.customerName)}
                              disabled={startingInspection === purchase.id}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {startingInspection === purchase.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <ClipboardCheck className="h-4 w-4 mr-2" />
                                  Start Inspection
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          // Inspection in progress or complete
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <ClipboardCheck className="h-6 w-6 text-blue-600" />
                                <div>
                                  <p className="font-semibold text-gray-900">🔍 Inspection In Progress</p>
                                  <p className="text-xs text-gray-600">
                                    {purchase.inspectionSession!.createdBy?.name 
                                      ? `Inspecting: ${purchase.inspectionSession!.createdBy.name}` 
                                      : 'Inspector: Staff'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Started</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(purchase.inspectionSession!.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Progress */}
                            {purchase.inspectionSession && (
                              <div className="mb-4">
                                {(() => {
                                  const verifiedCount = purchase.inspectionSession.incomingItems.filter(
                                    item => item.inspectionStatus === "VERIFIED"
                                  ).length
                                  const totalCount = purchase.inspectionSession.incomingItems.length
                                  const percentage = Math.round((verifiedCount / totalCount) * 100)
                                  const allVerified = verifiedCount === totalCount && totalCount > 0

                                  return (
                                    <>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700">
                                          Progress: {verifiedCount}/{totalCount} items inspected
                                        </span>
                                        <span className="text-sm font-semibold text-blue-600">{percentage}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full transition-all ${
                                            allVerified ? "bg-green-600" : "bg-blue-600"
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      {allVerified && (
                                        <p className="text-xs text-green-600 font-medium mt-1">
                                          ✅ All items inspected! Ready to send final quote.
                                        </p>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>
                            )}

                            {/* Product Cards */}
                            {purchase.inspectionSession && purchase.inspectionSession.incomingItems.length > 0 && (
                              <div className="space-y-3 mb-4">
                                {purchase.inspectionSession.incomingItems.map((item) => {
                                  const getStatusBadge = () => {
                                    if (item.verifiedItem?.approvedAt) {
                                      return <Badge className="bg-green-100 text-green-800">APPROVED</Badge>
                                    }
                                    if (item.inspectionStatus === "IN_PROGRESS" || item.verifiedItem?.verifiedAt) {
                                      return <Badge className="bg-blue-100 text-blue-800">IN PROGRESS</Badge>
                                    }
                                    return <Badge className="bg-gray-100 text-gray-800">UNVERIFIED</Badge>
                                  }

                                  return (
                                    <div
                                      key={item.id}
                                      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-400 transition-all"
                                    >
                                      <div className="flex items-center justify-between gap-4">
                                        <div 
                                          className="flex-1 cursor-pointer"
                                          onClick={() => window.location.href = `/dashboard/inspections/${purchase.inspectionSessionId}/items/${item.id}`}
                                        >
                                          <h4 className="font-semibold text-gray-900 mb-2">{item.clientName}</h4>
                                          <p className="text-sm text-gray-600">
                                            {item.verifiedItem?.locked ? (
                                              <span className="text-green-600 font-medium">
                                                ✓ Approved by Admin User
                                              </span>
                                            ) : item.inspectionStatus === "IN_PROGRESS" ? (
                                              <span className="text-blue-600">Click to continue verification</span>
                                            ) : (
                                              <span className="text-gray-500">Click to start verification</span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex items-center justify-center min-w-[100px]">
                                          {getStatusBadge()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteIncomingItem(item.id, item.clientName, purchase.id)
                                            }}
                                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                            title="Delete this product"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                                          </button>
                                          <ArrowRight className="h-5 w-5 text-gray-400" />
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                
                                {/* Add Products Button */}
                                <button
                                  onClick={() => handleAddProduct(purchase.inspectionSessionId!)}
                                  className="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg py-6 px-4 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2"
                                >
                                  <PackagePlus className="h-5 w-5" />
                                  <span className="font-medium">Add Products</span>
                                </button>
                              </div>
                            )}

                            {/* Send Final Quote Button */}
                            {purchase.inspectionSession && 
                             purchase.inspectionSession.incomingItems.length > 0 &&
                             purchase.inspectionSession.incomingItems.every(
                               item => item.inspectionStatus === "VERIFIED"
                             ) && !purchase.finalQuoteSentAt && (
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => handleSendFinalQuote(purchase.id, purchase.customerName, purchase.customerEmail!)}
                                  disabled={sendingFinalQuote === purchase.id || !purchase.customerEmail}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  {sendingFinalQuote === purchase.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Send Final Quote
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Final Quote Sent Status */}
                    {purchase.status === "FINAL_QUOTE_SENT" && purchase.finalQuoteSentAt && (
                      <div className="bg-green-50 rounded-lg border border-green-200 p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-gray-900">✅ Final Quote Sent</p>
                            <p className="text-sm text-gray-600">
                              Sent on {new Date(purchase.finalQuoteSentAt).toLocaleDateString()} - Awaiting customer response
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
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

      {/* Email Confirmation Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Send Quote to Client"
        size="md"
      >
        {selectedPurchase && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Send quote confirmation email to <strong>{selectedPurchase.customerName}</strong>?
            </p>
            
            <div>
              <Label htmlFor="quote-email">Email Address *</Label>
              <Input
                id="quote-email"
                type="email"
                value={emailForQuote}
                onChange={(e) => setEmailForQuote(e.target.value)}
                placeholder="customer@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Customer will receive a link to review and accept the quote
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-gray-900 mb-2">📧 What happens next:</p>
              <ul className="text-gray-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">1.</span>
                  <span>Client receives email with quote details and total amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">2.</span>
                  <span>They can accept or decline the quote via secure link</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">3.</span>
                  <span>If accepted, they'll provide personal details and banking info</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">4.</span>
                  <span>Purchase will move to <strong>"Awaiting Payment"</strong> section</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">5.</span>
                  <span>You'll receive a notification when client submits details</span>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-purple-900 mb-1">💰 Quote Summary</p>
              <p className="text-purple-700">
                {selectedPurchase.items.length} item(s) • Total: {formatPrice(selectedPurchase.totalQuoteAmount || 0)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowEmailModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSendQuote}
                disabled={!emailForQuote || sendingQuote === selectedPurchase.id}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {sendingQuote === selectedPurchase.id ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Quote
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Inspection Modal */}
      {inspectingItemId && inspectingPurchaseId && (
        <InspectItemModal
          open={true}
          onClose={() => {
            setInspectingItemId(null)
            setInspectingPurchaseId(null)
          }}
          purchaseId={inspectingPurchaseId}
          itemId={inspectingItemId}
          onSaved={() => {
            fetchPurchases()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Confirm Deletion
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                {deleteTarget.type === 'purchase' ? (
                  <>
                    Are you sure you want to delete all items for <strong>{deleteTarget.name}</strong>?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                  </>
                )}
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={cancelDelete}
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
