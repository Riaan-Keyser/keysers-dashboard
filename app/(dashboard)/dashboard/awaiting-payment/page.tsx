"use client"

import React, { useEffect, useState } from "react"
import { DollarSign, ChevronDown, ChevronRight, Check, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"

interface PendingItem {
  id: string
  name: string
  brand: string | null
  model: string | null
  finalPrice: number | null
  suggestedSellPrice: number | null
  status: string
}

interface PendingPurchase {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  invoiceNumber: string | null
  invoiceTotal: number | null
  totalQuoteAmount: number | null
  status: string
  approvedAt: string | null
  clientDetailsSubmitted: boolean
  clientIdNumber: string | null
  clientAddress: string | null
  clientBankName: string | null
  clientAccountNumber: string | null
  items: PendingItem[]
}

export default function AwaitingPaymentPage() {
  const [purchases, setPurchases] = useState<PendingPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set())
  const [selectedPurchase, setSelectedPurchase] = useState<PendingPurchase | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    setLoading(true)
    try {
      // Fetch purchases where client has submitted details (ready for payment)
      const response = await fetch("/api/incoming-gear?status=PENDING_APPROVAL")
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
    const newExpanded = new Set(expandedPurchases)
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId)
    } else {
      newExpanded.add(purchaseId)
    }
    setExpandedPurchases(newExpanded)
  }

  const openPaymentModal = (purchase: PendingPurchase) => {
    setSelectedPurchase(purchase)
    setPaymentAmount(purchase.totalQuoteAmount?.toString() || "")
    setShowPaymentModal(true)
  }

  const handleMarkPaid = async () => {
    if (!selectedPurchase) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/incoming-gear/${selectedPurchase.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: parseFloat(paymentAmount),
          paymentMethod
        })
      })

      if (response.ok) {
        alert("✅ Payment recorded! Items moved to Inventory.")
        setShowPaymentModal(false)
        setSelectedPurchase(null)
        fetchPurchases()
      }
    } catch (error) {
      console.error("Failed to mark as paid:", error)
      alert("Failed to record payment")
    } finally {
      setProcessing(false)
    }
  }

  const totalAwaitingPayment = purchases.reduce((sum, p) => sum + (p.totalQuoteAmount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading awaiting payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Awaiting Payment</h1>
        <p className="text-gray-500 mt-1">Approved gear waiting for customer payment</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">Awaiting Payment</p>
              <p className="text-2xl font-bold">{purchases.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-green-600">
            R {totalAwaitingPayment.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold">
            {purchases.reduce((sum, p) => sum + p.items.length, 0)}
          </p>
        </Card>
      </div>

      {/* Purchase List */}
      <div className="space-y-3">
        {purchases.length === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No purchases awaiting payment</p>
          </Card>
        ) : (
          purchases.map((purchase) => {
            const isExpanded = expandedPurchases.has(purchase.id)
            
            return (
              <Card key={purchase.id} className="overflow-hidden">
                {/* Purchase Header */}
                <button
                  onClick={() => toggleExpand(purchase.id)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{purchase.customerName}</h3>
                        <p className="text-sm text-gray-500">{purchase.customerPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{purchase.items.length} items</p>
                        <p className="text-lg font-bold text-green-600">
                          R {(purchase.totalQuoteAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="warning">Awaiting Payment</Badge>
                      {purchase.approvedAt && (
                        <span className="text-xs text-gray-400">
                          Approved {new Date(purchase.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Items */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-6">
                    {/* Client Details */}
                    {purchase.clientDetailsSubmitted && (
                      <div className="bg-white rounded-lg border p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Client Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">ID Number</p>
                            <p className="font-medium">{purchase.clientIdNumber || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Email</p>
                            <p className="font-medium">{purchase.customerEmail || "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Address</p>
                            <p className="font-medium">{purchase.clientAddress || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Bank</p>
                            <p className="font-medium">{purchase.clientBankName || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Account Number</p>
                            <p className="font-medium font-mono">{purchase.clientAccountNumber || "-"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {purchase.items.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              {(item.brand || item.model) && (
                                <p className="text-sm text-gray-600">
                                  {item.brand} {item.model}
                                </p>
                              )}

                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <p className="text-xs text-gray-500">Purchase Price</p>
                                  <p className="font-medium text-green-600">
                                    R {(item.finalPrice || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Will List For</p>
                                  <p className="font-medium text-blue-600">
                                    R {(item.suggestedSellPrice || 0).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Badge variant="success">Approved</Badge>
                          </div>
                        </div>
                      ))}

                      {/* Payment Action */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-800">
                              Ready to receive payment
                            </p>
                            <p className="text-sm text-green-600">
                              Amount due: R {(purchase.totalQuoteAmount || 0).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            onClick={() => openPaymentModal(purchase)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Mark as Paid Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment Received"
        size="md"
      >
        {selectedPurchase && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{selectedPurchase.customerName}</p>
              <p className="text-sm text-gray-600">{selectedPurchase.customerPhone}</p>
              <p className="text-lg font-bold text-green-600 mt-2">
                R {(selectedPurchase.totalQuoteAmount || 0).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount (R)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Amount received"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="CASH">Cash</option>
                <option value="EFT">EFT/Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 Once payment is confirmed, all items will be moved to Inventory with status "Pending Inspection"
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMarkPaid}
                disabled={!paymentAmount || processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? "Processing..." : "Confirm Payment & Add to Inventory"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
