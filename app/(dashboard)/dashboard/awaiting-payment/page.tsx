"use client"

import { useEffect, useState } from "react"
import { CreditCard, User, Mail, Phone, CheckCircle, Eye, Send, Calendar, Package, AlertCircle, Download, FileText, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ClientDetails {
  id: string
  fullName: string
  surname: string
  idNumber: string | null
  passportNumber: string | null
  email: string
  phone: string
  physicalAddress: string
  physicalCity: string | null
  physicalProvince: string | null
  physicalPostalCode: string | null
  bankName: string | null
  accountNumber: string | null
  accountType: string | null
  branchCode: string | null
  accountHolderName: string | null
  createdAt: string
}

interface PendingItem {
  id: string
  name: string
  brand: string | null
  model: string | null
  category: string | null
  condition: string | null
  finalPrice: number | null
  clientSelection: string | null // "BUY" or "CONSIGNMENT"
  buyPrice?: number | null
  consignPrice?: number | null
}

interface AwaitingPaymentPurchase {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  totalQuoteAmount: number | null
  status: string
  clientAcceptedAt: string | null
  createdAt: string
  quoteConfirmedAt: string | null
  items: PendingItem[]
  clientDetails: ClientDetails | null
}

const formatPrice = (price: number | null): string => {
  if (!price) return "-"
  const rounded = Math.round(price)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `R${formatted}`
}

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+27') || cleaned.startsWith('27')) {
    const number = cleaned.startsWith('+') ? cleaned.slice(3) : cleaned.slice(2)
    if (number.length === 9) {
      return `+27 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`
    }
  }
  return phone
}

export default function AwaitingPaymentPage() {
  const [purchases, setPurchases] = useState<AwaitingPaymentPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"AWAITING_PAYMENT" | "PAYMENT_RECEIVED">("AWAITING_PAYMENT")

  useEffect(() => {
    fetchAwaitingPayment()
  }, [statusFilter])

  const fetchAwaitingPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/incoming-gear?status=${statusFilter}`)
      const data = await response.json()
      
      // API returns array directly, not wrapped in { purchases: [] }
      const purchases = Array.isArray(data) ? data : []
      console.log(`📦 ${statusFilter} purchases:`, purchases.length)
      setPurchases(purchases)
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (purchaseId: string) => {
    if (!confirm("Mark this purchase as paid? This will move it to Payment Completed.")) return

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (response.ok) {
        alert("✅ Marked as paid!")
        fetchAwaitingPayment()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update status")
      }
    } catch (error) {
      alert("Failed to update status")
    }
  }

  const handleGenerateInvoice = (purchaseId: string) => {
    window.open(`/api/awaiting-payment/${purchaseId}/generate-invoice-pdf`, '_blank')
  }

  const toggleExpand = (purchaseId: string) => {
    setExpandedPurchase(expandedPurchase === purchaseId ? null : purchaseId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading awaiting payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1">
            Track payments and completed transactions
          </p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          {purchases.length} {purchases.length === 1 ? "Purchase" : "Purchases"}
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setStatusFilter("AWAITING_PAYMENT")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            statusFilter === "AWAITING_PAYMENT"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          ⏳ Awaiting Payment
        </button>
        <button
          onClick={() => setStatusFilter("PAYMENT_RECEIVED")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            statusFilter === "PAYMENT_RECEIVED"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          ✅ Payment Completed
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Awaiting Payment</p>
              <p className="text-2xl font-bold">{purchases.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold">
                {purchases.reduce((sum, p) => sum + p.items.length, 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Buy Items</p>
              <p className="text-2xl font-bold">
                {purchases.reduce((sum, p) => 
                  sum + p.items.filter(item => item.clientSelection === "BUY").length, 0
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">Consignment Items</p>
              <p className="text-2xl font-bold">
                {purchases.reduce((sum, p) => 
                  sum + p.items.filter(item => item.clientSelection === "CONSIGNMENT").length, 0
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Payable Value</p>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(purchases.reduce((sum, p) => {
              // Calculate only BUY items (instant payment)
              const buyTotal = p.items
                .filter(item => item.clientSelection === "BUY")
                .reduce((itemSum, item) => itemSum + (item.finalPrice || 0), 0)
              return sum + buyTotal
            }, 0))}
          </p>
        </Card>
      </div>

      {/* Empty state */}
      {purchases.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {statusFilter === "AWAITING_PAYMENT" ? "No Pending Payments" : "No Completed Payments"}
          </h3>
          <p className="text-gray-600">
            {statusFilter === "AWAITING_PAYMENT" 
              ? "Purchases will appear here when clients accept quotes and submit their details."
              : "Purchases will appear here after you mark them as paid."}
          </p>
        </Card>
      ) : (
        /* Purchases list */
        <div className="space-y-4">
          {purchases.map((purchase) => {
            // Calculate total for BUY items only (instant payment)
            const buyTotal = purchase.items
              .filter(item => item.clientSelection === "BUY")
              .reduce((sum, item) => sum + (item.finalPrice || 0), 0)
            const isExpanded = expandedPurchase === purchase.id

            return (
              <Card key={purchase.id} className="overflow-hidden">
                {/* Purchase Header - Collapsible */}
                <button
                  onClick={() => toggleExpand(purchase.id)}
                  className="w-full p-6 hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        {purchase.customerName}
                        {statusFilter === "AWAITING_PAYMENT" ? (
                          <Badge variant="default" className="ml-2 bg-yellow-500">
                            Awaiting Payment
                          </Badge>
                        ) : (
                          <Badge variant="success" className="ml-2">
                            Payment Completed
                          </Badge>
                        )}
                      </h3>
                      
                      {/* Client contact info (compact view) */}
                      {!isExpanded && purchase.clientDetails && (
                        <div className="flex gap-4 text-sm text-gray-600 mt-2">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {purchase.clientDetails.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {formatPhoneNumber(purchase.clientDetails.phone)}
                          </div>
                        </div>
                      )}

                      {/* Items count */}
                      <p className="text-sm text-gray-500 mt-2">
                        <Package className="h-4 w-4 inline mr-1" />
                        {purchase.items.length} item(s)
                      </p>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500 mb-1">Instant Payment Total</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatPrice(buyTotal)}
                      </p>
                      {purchase.clientAcceptedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Accepted {new Date(purchase.clientAcceptedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-6 space-y-6">
                    {/* Client Details - Full View */}
                    {purchase.clientDetails && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Client Information
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Full Name</p>
                            <p className="font-medium text-gray-900">
                              {purchase.clientDetails.fullName} {purchase.clientDetails.surname}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">ID / Passport</p>
                            <p className="font-medium text-gray-900">
                              {purchase.clientDetails.idNumber || purchase.clientDetails.passportNumber || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Email</p>
                            <p className="font-medium text-gray-900">{purchase.clientDetails.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">
                              {formatPhoneNumber(purchase.clientDetails.phone)}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-gray-500">Address</p>
                            <p className="font-medium text-gray-900">
                              {purchase.clientDetails.physicalAddress}
                              {purchase.clientDetails.physicalCity && `, ${purchase.clientDetails.physicalCity}`}
                              {purchase.clientDetails.physicalProvince && `, ${purchase.clientDetails.physicalProvince}`}
                              {purchase.clientDetails.physicalPostalCode && ` ${purchase.clientDetails.physicalPostalCode}`}
                            </p>
                          </div>
                        </div>

                        {/* Banking Details */}
                        {purchase.clientDetails.bankName && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="font-medium text-gray-700 mb-2">Banking Details</p>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Bank: </span>
                                <span className="font-medium">{purchase.clientDetails.bankName}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Account Type: </span>
                                <span className="font-medium">{purchase.clientDetails.accountType || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Account Number: </span>
                                <span className="font-medium">{purchase.clientDetails.accountNumber || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Branch Code: </span>
                                <span className="font-medium">{purchase.clientDetails.branchCode || "N/A"}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-gray-500">Account Holder: </span>
                                <span className="font-medium">{purchase.clientDetails.accountHolderName || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items List with Client Selections */}
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Items ({purchase.items.length})
                      </h4>
                      <div className="space-y-2">
                        {purchase.items.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  {item.clientSelection && (
                                    <Badge 
                                      variant={item.clientSelection === "BUY" ? "success" : "default"}
                                      className="text-xs"
                                    >
                                      {item.clientSelection === "BUY" ? (
                                        <>
                                          <CreditCard className="h-3 w-3 mr-1" />
                                          Buy
                                        </>
                                      ) : (
                                        <>
                                          <ShoppingCart className="h-3 w-3 mr-1" />
                                          Consignment
                                        </>
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {item.brand} {item.model && `• ${item.model}`} {item.condition && `• ${item.condition}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">
                                  {formatPrice(item.finalPrice)}
                                </p>
                                {item.clientSelection && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.clientSelection === "BUY" ? "Instant Payment" : "Pay on Sale"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Agreement PDFs */}
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Client Agreements
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {(() => {
                          const hasBuy = purchase.items.some(item => item.clientSelection === "BUY")
                          const hasConsignment = purchase.items.some(item => item.clientSelection === "CONSIGNMENT")
                          
                          return (
                            <>
                              {hasBuy && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    <p className="font-medium text-gray-900">Purchase Agreement</p>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-3">
                                    Supplier's Invoice for items being purchased
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.open(`/api/awaiting-payment/${purchase.id}/generate-agreement-pdf?type=purchase`, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                  </Button>
                                </div>
                              )}
                              
                              {hasConsignment && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                                    <p className="font-medium text-gray-900">Consignment Agreement</p>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-3">
                                    Agreement for items on consignment
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.open(`/api/awaiting-payment/${purchase.id}/generate-agreement-pdf?type=consignment`, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                  </Button>
                                </div>
                              )}

                              {!hasBuy && !hasConsignment && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:col-span-2">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-medium text-yellow-900 text-sm">No Selection Information</p>
                                      <p className="text-yellow-700 text-xs mt-1">
                                        Client selections (Buy vs Consignment) not available. This may be from an older quote.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                      <p className="font-medium text-blue-900 mb-2">📅 Timeline</p>
                      <div className="space-y-1 text-blue-700">
                        <p>Created: {new Date(purchase.createdAt).toLocaleString()}</p>
                        {purchase.quoteConfirmedAt && (
                          <p>Quote Sent: {new Date(purchase.quoteConfirmedAt).toLocaleString()}</p>
                        )}
                        {purchase.clientAcceptedAt && (
                          <p>Client Accepted: {new Date(purchase.clientAcceptedAt).toLocaleString()}</p>
                        )}
                        {purchase.clientDetails && (
                          <p>Details Submitted: {new Date(purchase.clientDetails.createdAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                      {statusFilter === "AWAITING_PAYMENT" && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(purchase.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateInvoice(purchase.id)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Invoice PDF
                      </Button>
                      
                      {statusFilter === "AWAITING_PAYMENT" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`mailto:${purchase.clientDetails?.email}?subject=Payment Reminder for Quote ${purchase.id.slice(0, 8)}`)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>

                          {purchase.clientDetails && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${purchase.clientDetails?.phone}`)}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call Client
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {!purchase.clientDetails && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-900">Client Details Pending</p>
                            <p className="text-yellow-700">
                              The client has accepted the quote but hasn't submitted their details yet.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
