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
import { AlertModal } from "@/components/ui/alert-modal"
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
  if (!phone) return phone
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Format +27XXXXXXXXX as +27 XX XXX XXXX
  if (cleaned.startsWith('+27')) {
    const number = cleaned.substring(3)
    if (number.length === 9) {
      return `+27 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`
    }
    // Return with +27 prefix even if not exactly 9 digits
    return `+27 ${number}`
  }
  
  // Format 0XXXXXXXXX as 0XX XXX XXXX
  if (cleaned.startsWith('0')) {
    const number = cleaned.substring(1)
    if (number.length === 9) {
      return `0${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`
    }
    // Return with 0 prefix even if not exactly 9 digits
    return `0${number}`
  }
  
  // Return original if format not recognized
  return phone
}

const formatPrice = (price: number | null): string => {
  if (!price) return "-"
  
  // Format number with space as thousands separator (South African format)
  const rounded = Math.round(price)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  
  return `R${formatted}`
}

const validateEmail = (email: string): boolean => {
  if (!email) return true // Email is optional
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default function IncomingGearPage() {
  const [purchases, setPurchases] = useState<PendingPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(() => {
    // Restore expanded state from sessionStorage (persists across navigation)
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('incomingGear_expandedPurchase')
      if (saved) {
        return new Set([saved])
      }
    }
    return new Set()
  })
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
  
  // Final quote confirmation modal
  const [showFinalQuoteModal, setShowFinalQuoteModal] = useState(false)
  const [finalQuoteTarget, setFinalQuoteTarget] = useState<{
    purchaseId: string
    customerName: string
    customerEmail: string
  } | null>(null)

  // Alert Modal
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    type: "success" | "error" | "info" | "warning"
  }>({
    isOpen: false,
    message: "",
    type: "info"
  })

  // Walk-in Client Modal
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [walkInData, setWalkInData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: ""
  })
  const [creatingWalkIn, setCreatingWalkIn] = useState(false)
  const [walkInErrors, setWalkInErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: ""
  })

  // Undo confirmation modal
  const [showUndoModal, setShowUndoModal] = useState(false)
  const [undoTarget, setUndoTarget] = useState<{
    purchaseId: string
    customerName: string
  } | null>(null)
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
  
  // Add product loading state
  const [addingProduct, setAddingProduct] = useState<string | null>(null)

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

  // Refresh when navigating back to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPurchases(true) // Silent refresh when page becomes visible
      }
    }

    const handleFocus = () => {
      fetchPurchases(true) // Silent refresh when window gains focus
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

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
      sessionStorage.removeItem('incomingGear_expandedPurchase')
    } else {
      // Expand this one, collapse all others
      setExpandedPurchases(new Set([purchaseId]))
      sessionStorage.setItem('incomingGear_expandedPurchase', purchaseId)
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
        // Trigger immediate notification count refresh in sidebar
        window.dispatchEvent(new Event('refreshNotificationCounts'))
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

  const handleAddProduct = async (sessionId: string, purchaseId: string) => {
    if (addingProduct) return // Prevent double-clicks
    
    setAddingProduct(sessionId)
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
        // Save expanded state before navigating
        sessionStorage.setItem('incomingGear_expandedPurchase', purchaseId)
        // Navigate to verify page for the new item (with ?new=true to prevent auto-search)
        window.location.href = `/dashboard/inspections/${sessionId}/items/${newItem.id}?new=true`
      } else {
        const data = await response.json()
        setAlertModal({
          isOpen: true,
          message: data.error || "Failed to add product",
          type: "error"
        })
        setAddingProduct(null)
      }
    } catch (error) {
      console.error("Failed to add product:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to add product. Please try again.",
        type: "error"
      })
      setAddingProduct(null)
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
        setAlertModal({
          isOpen: true,
          message: data.error || "Failed to send quote",
          type: "error"
        })
        return
      }

      setAlertModal({
        isOpen: true,
        message: `Quote sent successfully to ${emailForQuote}\n\nThe customer will receive an email with a link to review and accept the quote.`,
        type: "success"
      })
      setShowEmailModal(false)
      fetchPurchases() // Refresh list
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: "Failed to send quote. Please try again.",
        type: "error"
      })
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
        setAlertModal({
          isOpen: true,
          message: `Invoice ${data.invoiceNumber} generated!\n\nEmail sent to client with Accept/Decline buttons.\n\nOnce client accepts and submits details, it will appear in Awaiting Payment.`,
          type: "success"
        })
        fetchPurchases()
      }
    } catch (error) {
      console.error("Failed to approve:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to generate invoice",
        type: "error"
      })
    }
  }

  const handleMarkAsReceived = async (purchaseId: string, customerName: string) => {
    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/mark-received`, {
        method: "POST"
      })

      if (response.ok) {
        // Success - just refresh the list without showing alert
        fetchPurchases()
        // Trigger immediate notification count refresh in sidebar
        window.dispatchEvent(new Event('refreshNotificationCounts'))
      } else {
        // Only show error alerts
        const data = await response.json()
        setAlertModal({
          isOpen: true,
          message: `Failed: ${data.error || "Unable to mark as received"}`,
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to mark as received:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to mark gear as received",
        type: "error"
      })
    }
  }

  const handleUndoReceived = async (purchaseId: string, customerName: string) => {
    // Show confirmation modal instead of native confirm
    setUndoTarget({ purchaseId, customerName })
    setShowUndoModal(true)
  }

  const confirmUndoReceived = async () => {
    if (!undoTarget) return

    const { purchaseId, customerName } = undoTarget
    setShowUndoModal(false)
    setUndoingReceived(purchaseId)

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/undo-received`, {
        method: "POST"
      })

      if (response.ok) {
        // Success - just refresh the list without showing alert
        fetchPurchases()
        // Trigger immediate notification count refresh in sidebar
        window.dispatchEvent(new Event('refreshNotificationCounts'))
      } else {
        // Only show error alerts
        const data = await response.json()
        setAlertModal({
          isOpen: true,
          message: `Failed: ${data.error || "Unable to undo"}`,
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to undo:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to undo action",
        type: "error"
      })
    } finally {
      setUndoingReceived(null)
      setUndoTarget(null)
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

  const handleSendFinalQuote = (purchaseId: string, customerName: string, customerEmail: string) => {
    setFinalQuoteTarget({ purchaseId, customerName, customerEmail })
    setShowFinalQuoteModal(true)
  }

  const confirmSendFinalQuote = async () => {
    if (!finalQuoteTarget) return

    setSendingFinalQuote(finalQuoteTarget.purchaseId)
    setShowFinalQuoteModal(false)

    try {
      const response = await fetch(`/api/incoming-gear/${finalQuoteTarget.purchaseId}/send-final-quote`, {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          message: `Final quote sent successfully!\n\nSent to: ${data.sentTo}\nItems: ${data.itemCount}\n\nThe customer can now review and accept.`,
          type: "success"
        })
        fetchPurchases()
        // Trigger immediate notification count refresh in sidebar
        window.dispatchEvent(new Event('refreshNotificationCounts'))
      } else {
        setAlertModal({
          isOpen: true,
          message: `Failed: ${data.error || "Unable to send final quote"}`,
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to send final quote:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to send final quote",
        type: "error"
      })
    } finally {
      setSendingFinalQuote(null)
      setFinalQuoteTarget(null)
    }
  }

  const cancelSendFinalQuote = () => {
    setShowFinalQuoteModal(false)
    setFinalQuoteTarget(null)
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

  const handleCreateWalkIn = async () => {
    // Reset errors
    const errors = {
      firstName: "",
      lastName: "",
      phone: "",
      email: ""
    }

    // Validate all fields
    let hasError = false

    if (!walkInData.firstName) {
      errors.firstName = "First name is required"
      hasError = true
    }

    if (!walkInData.lastName) {
      errors.lastName = "Last name is required"
      hasError = true
    }

    if (!walkInData.phone) {
      errors.phone = "Phone number is required"
      hasError = true
    }

    if (walkInData.email && !validateEmail(walkInData.email)) {
      errors.email = "Please enter a valid email address"
      hasError = true
    }

    setWalkInErrors(errors)

    if (hasError) {
      return
    }

    setCreatingWalkIn(true)
    try {
      const response = await fetch("/api/incoming-gear/create-walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walkInData)
      })

      if (!response.ok) {
        throw new Error("Failed to create walk-in client")
      }

      const result = await response.json()
      
      setShowWalkInModal(false)
      setWalkInData({ firstName: "", lastName: "", phone: "", email: "" })
      setWalkInErrors({ firstName: "", lastName: "", phone: "", email: "" })

      // Refresh the list to show the new purchase
      await fetchPurchases(true)
      
      // Expand the newly created purchase and save to sessionStorage
      setExpandedPurchases(new Set([result.purchaseId]))
      sessionStorage.setItem('incomingGear_expandedPurchase', result.purchaseId)
      
      // Trigger immediate notification count refresh in sidebar
      window.dispatchEvent(new Event('refreshNotificationCounts'))
    } catch (error) {
      console.error("Failed to create walk-in client:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to create walk-in client. Please try again.",
        type: "error"
      })
    } finally {
      setCreatingWalkIn(false)
    }
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
          
          {/* New Walk-in Client button */}
          <Button
            onClick={() => {
              setShowWalkInModal(true)
              setWalkInErrors({ firstName: "", lastName: "", phone: "", email: "" })
            }}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <PackagePlus className="h-4 w-4" />
            New Walk-in Client
          </Button>
          
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
                    {/* Tracking Info & Received / Undo / Client Informed */}
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
                            
                            // State 1: Received button (initial state)
                            if (!purchase.gearReceivedAt) {
                              return (
                                <Button
                                  onClick={() => handleMarkAsReceived(purchase.id, purchase.customerName)}
                                  variant="outline"
                                  size="sm"
                                  className="border-green-600 text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Received
                                </Button>
                              )
                            }
                            
                            return null
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Products Preview (Before Received) - Same layout as inspection, but non-interactive */}
                    {!purchase.gearReceivedAt && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <ClipboardCheck className="h-6 w-6 text-gray-400" />
                            <div>
                              <p className="font-semibold text-gray-900">Ready for Inspection</p>
                              <p className="text-xs text-gray-600">
                                Gear received. Click to start verifying items.
                              </p>
                            </div>
                          </div>
                        </div>

                        {purchase.items && purchase.items.length > 0 && (
                          <>
                            {/* Progress - static 0% */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">
                                  Progress: 0/{purchase.items.length} items inspected
                                </span>
                                <span className="text-sm font-semibold text-gray-400">0%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }} />
                              </div>
                            </div>

                            {/* Product Cards - Same layout, non-interactive */}
                            <div className="space-y-3 mb-4">
                              {purchase.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="bg-white border-2 border-gray-200 rounded-lg p-4"
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 mb-2">{item.name}</h4>
                                      <p className="text-sm text-gray-500">Awaiting gear receipt</p>
                                    </div>
                                    <div className="flex items-center justify-center min-w-[100px]">
                                      <Badge variant="default">UNVERIFIED</Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
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
                                  const percentage = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0
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
                                      return <Badge variant="success">APPROVED</Badge>
                                    }
                                    if (item.inspectionStatus === "IN_PROGRESS" || item.verifiedItem?.verifiedAt) {
                                      return <Badge variant="info">IN PROGRESS</Badge>
                                    }
                                    return <Badge variant="default">UNVERIFIED</Badge>
                                  }

                                  return (
                                    <div
                                      key={item.id}
                                      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-400 transition-all"
                                    >
                                      <div className="flex items-center justify-between gap-4">
                                        <div 
                                          className="flex-1 cursor-pointer"
                                          onClick={() => {
                                            sessionStorage.setItem('incomingGear_expandedPurchase', purchase.id)
                                            window.location.href = `/dashboard/inspections/${purchase.inspectionSessionId}/items/${item.id}`
                                          }}
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
                              </div>
                            )}
                            
                            {/* Add Products Button - Always show when inspection exists */}
                            {purchase.inspectionSession && (
                              <div className="mb-4">
                                <button
                                  onClick={() => handleAddProduct(purchase.inspectionSessionId!, purchase.id)}
                                  disabled={addingProduct === purchase.inspectionSessionId}
                                  className="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg py-6 px-4 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {addingProduct === purchase.inspectionSessionId ? (
                                    <>
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                      <span className="font-medium">Adding Product...</span>
                                    </>
                                  ) : (
                                    <>
                                      <PackagePlus className="h-5 w-5" />
                                      <span className="font-medium">Add Products</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {/* Confirm Button - Send Final Quote */}
                            {purchase.inspectionSession && (() => {
                              // Check if all items are approved
                              const allApproved = purchase.inspectionSession!.incomingItems.every(
                                item => item.verifiedItem?.approvedAt
                              )
                              const hasItems = purchase.inspectionSession!.incomingItems.length > 0
                              const alreadySent = purchase.finalQuoteSentAt
                              
                              if (hasItems && allApproved && !alreadySent) {
                                return (
                                  <button
                                    onClick={() => handleSendFinalQuote(purchase.id, purchase.customerName, purchase.customerEmail!)}
                                    disabled={sendingFinalQuote === purchase.id || !purchase.customerEmail}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-4 px-4 transition-all flex items-center justify-center gap-2"
                                  >
                                    {sendingFinalQuote === purchase.id ? (
                                      <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Sending Final Quote...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-5 w-5" />
                                        <span>Confirm - Send Final Quote to Client</span>
                                      </>
                                    )}
                                  </button>
                                )
                              }
                              return null
                            })()}
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative z-10">
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

      {/* Send Final Quote Confirmation Modal */}
      {showFinalQuoteModal && finalQuoteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative z-10">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Send final quote to {finalQuoteTarget.customerName} ({finalQuoteTarget.customerEmail})?
              </h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 font-medium mb-2">This will:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Email the customer with their final quote</li>
                  <li>- Allow them to choose Buy vs Consignment</li>
                  <li>- Update status to "Final Quote Sent"</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={cancelSendFinalQuote}
                  variant="outline"
                  className="flex-1"
                  disabled={sendingFinalQuote === finalQuoteTarget.purchaseId}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSendFinalQuote}
                  disabled={sendingFinalQuote === finalQuoteTarget.purchaseId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sendingFinalQuote === finalQuoteTarget.purchaseId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      OK
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Received Confirmation Modal */}
      {showUndoModal && undoTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity" 
            onClick={() => setShowUndoModal(false)}
          />
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative z-10">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Undo "Mark as Received" for {undoTarget.customerName}?
              </h3>
              
              <p className="text-gray-600 mb-6">
                This will reset the status and the client will NOT be notified.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowUndoModal(false)
                    setUndoTarget(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmUndoReceived}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Client Modal */}
      <Modal 
        isOpen={showWalkInModal} 
        onClose={() => {
          setShowWalkInModal(false)
          setWalkInErrors({ firstName: "", lastName: "", phone: "", email: "" })
        }}
        title="New Walk-in Client"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Create a new walk-in client to start the inspection process immediately. No email or delivery steps required.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="walkInFirstName">First Name *</Label>
              <Input
                id="walkInFirstName"
                value={walkInData.firstName}
                onChange={(e) => {
                  setWalkInData({ ...walkInData, firstName: e.target.value })
                  setWalkInErrors({ ...walkInErrors, firstName: "" })
                }}
                placeholder="John"
                className={walkInErrors.firstName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {walkInErrors.firstName && (
                <p className="text-xs text-red-600 mt-1">{walkInErrors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="walkInLastName">Last Name *</Label>
              <Input
                id="walkInLastName"
                value={walkInData.lastName}
                onChange={(e) => {
                  setWalkInData({ ...walkInData, lastName: e.target.value })
                  setWalkInErrors({ ...walkInErrors, lastName: "" })
                }}
                placeholder="Doe"
                className={walkInErrors.lastName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {walkInErrors.lastName && (
                <p className="text-xs text-red-600 mt-1">{walkInErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="walkInPhone">Phone Number *</Label>
            <Input
              id="walkInPhone"
              value={walkInData.phone}
              onChange={(e) => {
                setWalkInData({ ...walkInData, phone: e.target.value })
                setWalkInErrors({ ...walkInErrors, phone: "" })
              }}
              placeholder="e.g. 072 123 4567 or +27 72 123 4567"
              className={walkInErrors.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {walkInErrors.phone && (
              <p className="text-xs text-red-600 mt-1">{walkInErrors.phone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="walkInEmail">Email (Optional)</Label>
            <Input
              id="walkInEmail"
              type="email"
              value={walkInData.email}
              onChange={(e) => {
                setWalkInData({ ...walkInData, email: e.target.value })
                setWalkInErrors({ ...walkInErrors, email: "" })
              }}
              placeholder="john@example.com"
              className={walkInErrors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {walkInErrors.email && (
              <p className="text-xs text-red-600 mt-1">{walkInErrors.email}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowWalkInModal(false)
                setWalkInErrors({ firstName: "", lastName: "", phone: "", email: "" })
              }}
              disabled={creatingWalkIn}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWalkIn}
              disabled={creatingWalkIn || !walkInData.firstName || !walkInData.lastName || !walkInData.phone}
            >
              {creatingWalkIn ? "Creating..." : "Create & Start Inspection"}
            </Button>
          </div>
        </div>
      </Modal>

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
