# Phase 6: Dashboard Integration

**Duration:** 2 hours  
**Status:** ✅ COMPLETE  
**Dependencies:** Phase 2 (Backend APIs), Phase 5 (Client Form)

---

## 🎯 Objectives

1. Add "Confirm Quote" button to Incoming Gear page
2. Create new "Awaiting Payment" section/page
3. Display items awaiting payment
4. Add actions for awaiting payment items
5. Update navigation to include new section
6. Add status indicators

---

## 🛠️ Implementation

### Task 1: Add "Confirm Quote" Button to Incoming Gear

**File:** `app/(dashboard)/dashboard/incoming/page.tsx` (UPDATE)

Find the action buttons section and add the "Confirm Quote" button:

```typescript
// Add state for quote confirmation
const [sendingQuote, setSendingQuote] = useState<string | null>(null)
const [showEmailModal, setShowEmailModal] = useState(false)
const [selectedPurchase, setSelectedPurchase] = useState<PendingPurchase | null>(null)
const [emailForQuote, setEmailForQuote] = useState("")

// Add function to handle sending quote
const handleSendQuote = async (purchase: PendingPurchase) => {
  setSelectedPurchase(purchase)
  setEmailForQuote(purchase.customerEmail || "")
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

    alert(`✅ Quote sent successfully to ${emailForQuote}`)
    setShowEmailModal(false)
    fetchPurchases() // Refresh list
  } catch (error) {
    alert("Failed to send quote. Please try again.")
  } finally {
    setSendingQuote(null)
  }
}

// In the JSX, add the button next to existing action buttons:
// (Only show for APPROVED or PENDING_REVIEW statuses)
{purchase.status === "APPROVED" || purchase.status === "PENDING_REVIEW" ? (
  <Button
    size="sm"
    onClick={() => handleSendQuote(purchase)}
    disabled={sendingQuote === purchase.id}
    className="bg-purple-600 hover:bg-purple-700"
  >
    <Mail className="h-4 w-4 mr-1" />
    {sendingQuote === purchase.id ? "Sending..." : "Confirm Quote"}
  </Button>
) : null}

// Add email confirmation modal at the end of the component:
{showEmailModal && selectedPurchase && (
  <Modal
    isOpen={showEmailModal}
    onClose={() => setShowEmailModal(false)}
    title="Send Quote to Client"
  >
    <div className="space-y-4">
      <p className="text-gray-600">
        Send quote confirmation email to <strong>{selectedPurchase.customerName}</strong>?
      </p>
      
      <div>
        <Label htmlFor="quote-email">Email Address</Label>
        <Input
          id="quote-email"
          type="email"
          value={emailForQuote}
          onChange={(e) => setEmailForQuote(e.target.value)}
          placeholder="customer@example.com"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        <p className="font-medium text-gray-900 mb-1">What happens next:</p>
        <ul className="text-gray-700 space-y-1">
          <li>• Client receives email with quote details</li>
          <li>• They can accept or decline the quote</li>
          <li>• If accepted, they'll provide their details</li>
          <li>• Item will move to "Awaiting Payment" section</li>
        </ul>
      </div>

      <div className="flex gap-3">
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
          {sendingQuote === selectedPurchase.id ? "Sending..." : "Send Quote"}
        </Button>
      </div>
    </div>
  </Modal>
)}
```

**Don't forget to import Mail icon:**
```typescript
import { Mail } from "lucide-react"
```

---

### Task 2: Create "Awaiting Payment" Page

**File:** `app/(dashboard)/dashboard/awaiting-payment/page.tsx` (NEW)

```typescript
"use client"

import { useEffect, useState } from "react"
import { CreditCard, User, Mail, Phone, CheckCircle, Eye, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ClientDetails {
  fullName: string
  surname: string
  email: string
  phone: string
  physicalAddress: string
  submittedAt: string
}

interface AwaitingPaymentItem {
  id: string
  customerName: string
  customerEmail: string | null
  totalQuoteAmount: number | null
  status: string
  clientAcceptedAt: string | null
  createdAt: string
  items: {
    name: string
    finalPrice: number | null
  }[]
  clientDetails: ClientDetails | null
}

export default function AwaitingPaymentPage() {
  const [purchases, setPurchases] = useState<AwaitingPaymentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAwaitingPayment()
  }, [])

  const fetchAwaitingPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/incoming-gear?status=AWAITING_PAYMENT")
      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Failed to fetch awaiting payment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (purchaseId: string) => {
    if (!confirm("Mark this purchase as paid?")) return

    try {
      const response = await fetch(`/api/incoming-gear/${purchaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "PAYMENT_RECEIVED",
          action: "mark-paid"
        })
      })

      if (response.ok) {
        alert("✅ Marked as paid!")
        fetchAwaitingPayment()
      } else {
        alert("Failed to update status")
      }
    } catch (error) {
      alert("Failed to update status")
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Awaiting Payment</h1>
          <p className="text-gray-600 mt-1">
            Clients who have accepted quotes and submitted their details
          </p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          {purchases.length} {purchases.length === 1 ? "Purchase" : "Purchases"}
        </Badge>
      </div>

      {/* Empty state */}
      {purchases.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Payments</h3>
          <p className="text-gray-600">
            Purchases will appear here when clients accept quotes and submit their details.
          </p>
        </Card>
      ) : (
        /* Purchases list */
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const total = purchase.totalQuoteAmount || 
              purchase.items.reduce((sum, item) => sum + (item.finalPrice || 0), 0)

            return (
              <Card key={purchase.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {purchase.customerName}
                    </h3>
                    
                    {/* Client contact info */}
                    {purchase.clientDetails && (
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {purchase.clientDetails.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {purchase.clientDetails.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {purchase.clientDetails.fullName} {purchase.clientDetails.surname}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-green-600">
                      R{total.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Items summary */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Items ({purchase.items.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {purchase.items.map((item, idx) => (
                      <Badge key={idx} variant="secondary">
                        {item.name} - R{item.finalPrice?.toLocaleString() || "TBC"}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t pt-4 mb-4 text-sm text-gray-600">
                  <p>Accepted: {purchase.clientAcceptedAt ? new Date(purchase.clientAcceptedAt).toLocaleString() : "N/A"}</p>
                  {purchase.clientDetails && (
                    <p>Details submitted: {new Date(purchase.clientDetails.submittedAt).toLocaleString()}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsPaid(purchase.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark as Paid
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`mailto:${purchase.clientDetails?.email}`)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Reminder
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

---

### Task 3: Update Navigation

**File:** `app/(dashboard)/layout.tsx` or navigation component (UPDATE)

Add "Awaiting Payment" to the navigation menu:

```typescript
// Add to navigation items
const navItems = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Incoming Gear", href: "/dashboard/incoming", icon: PackagePlus },
  { name: "Awaiting Payment", href: "/dashboard/awaiting-payment", icon: CreditCard }, // NEW
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Vendors/Clients", href: "/dashboard/vendors", icon: Users },
  // ... other items
]
```

Don't forget to import the icon:
```typescript
import { CreditCard } from "lucide-react"
```

---

### Task 4: Update Status Filter in Incoming Gear

Update the status filter to exclude items that are awaiting payment:

```typescript
// In fetchPurchases function, ensure AWAITING_PAYMENT items don't show up
// They should only appear in the Awaiting Payment section
```

---

## ✅ Completion Checklist

- [ ] Added "Confirm Quote" button to Incoming Gear
- [ ] Created email confirmation modal
- [ ] Implemented send quote functionality
- [ ] Created Awaiting Payment page
- [ ] Added mark as paid functionality
- [ ] Added send reminder functionality
- [ ] Updated navigation with new section
- [ ] Tested quote sending flow
- [ ] Tested awaiting payment display
- [ ] Verified items move between sections correctly
- [ ] Committed changes

---

## 🧪 Testing Checklist

- [ ] Click "Confirm Quote" in Incoming Gear
- [ ] Verify email modal appears with pre-filled email
- [ ] Send quote and verify email is received
- [ ] Accept quote via email link
- [ ] Submit client details
- [ ] Verify item appears in Awaiting Payment
- [ ] Verify item disappears from Incoming Gear
- [ ] Mark item as paid
- [ ] Verify status updates correctly

---

## 📝 Git Backup

```bash
git add app/\(dashboard\)
git commit -m "Phase 6 Complete: Dashboard integration with Awaiting Payment section"
git tag -a quote-workflow-phase-6-complete -m "Dashboard updates complete"
```

---

**Phase Status:** 🔴 Not Started  
**Next Phase:** `PHASE_7_TESTING.md`
