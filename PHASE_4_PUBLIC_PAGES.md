# Phase 4: Public Quote Pages

**Duration:** 3-4 hours  
**Status:** ✅ COMPLETE  
**Dependencies:** Phase 2 (Backend APIs), Phase 3 (Email Setup)

---

## 🎯 Objectives

1. Create public quote review page (no authentication)
2. Design professional, branded layout
3. Add Accept/Decline buttons
4. Handle expired/invalid tokens gracefully
5. Create decline feedback page
6. Ensure mobile-responsive design

---

## 🗂️ File Structure

```
app/(public)/
└── quote/
    └── [token]/
        ├── page.tsx          (Quote review page)
        ├── accept/
        │   └── page.tsx      (Redirect to details form)
        ├── declined/
        │   └── page.tsx      (Decline confirmation)
        └── layout.tsx        (Public layout - no auth)
```

---

## 🛠️ Implementation

### Task 1: Public Layout

**File:** `app/(public)/layout.tsx` (NEW)

```typescript
import { Inter } from "next/font/google"
import "../globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Keysers - Quote Confirmation",
  description: "Review and confirm your quote",
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* Simple header */}
          <header className="bg-white border-b">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-gray-900">Keysers</h1>
            </div>
          </header>
          
          {/* Main content */}
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          
          {/* Simple footer */}
          <footer className="bg-white border-t mt-16">
            <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
              <p>&copy; {new Date().getFullYear()} Keysers. All rights reserved.</p>
              <p className="mt-2">
                <a href="https://keysers.co.za" className="text-blue-600 hover:underline">
                  www.keysers.co.za
                </a>
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
```

---

### Task 2: Quote Review Page

**File:** `app/(public)/quote/[token]/page.tsx` (NEW)

```typescript
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, X, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface QuoteItem {
  name: string
  brand: string | null
  model: string | null
  condition: string | null
  description: string | null
  price: number | null
  imageUrls: string[]
}

interface Quote {
  id: string
  customerName: string
  items: QuoteItem[]
  totalAmount: number | null
  createdAt: string
  expiresAt: string | null
}

export default function QuoteReviewPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  useEffect(() => {
    fetchQuote()
  }, [token])

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quote-confirmation/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to load quote")
        setLoading(false)
        return
      }

      setQuote(data.quote)
      setLoading(false)
    } catch (err: any) {
      setError("Failed to load quote. Please try again.")
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const response = await fetch(`/api/quote-confirmation/${token}/accept`, {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Failed to accept quote")
        setAccepting(false)
        return
      }

      // Redirect to details form
      router.push(`/quote/${token}/details`)
    } catch (err) {
      alert("Failed to accept quote. Please try again.")
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    router.push(`/quote/${token}/declined`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your quote...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <p className="text-sm text-gray-500">
          This link may have expired or is invalid. Please contact us if you need assistance.
        </p>
      </Card>
    )
  }

  if (!quote) {
    return null
  }

  const total = quote.totalAmount || quote.items.reduce((sum, item) => sum + (item.price || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Quote from Keysers</h1>
        <p className="text-gray-600">Hi {quote.customerName}, please review the offer below:</p>
      </Card>

      {/* Items */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Items ({quote.items.length})
        </h2>

        <div className="space-y-4">
          {quote.items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  {item.brand && (
                    <p className="text-sm text-gray-600">
                      {item.brand} {item.model && `- ${item.model}`}
                    </p>
                  )}
                  {item.condition && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {item.condition}
                    </span>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-green-600">
                    R{item.price?.toLocaleString() || "TBC"}
                  </p>
                </div>
              </div>

              {/* Image preview */}
              {item.imageUrls.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {item.imageUrls.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${item.name} ${i + 1}`}
                      className="h-20 w-20 object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-900">Total Offer:</span>
            <span className="text-3xl font-bold text-green-600">
              R{total.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-gray-900 mb-3">What would you like to do?</h3>
        <p className="text-gray-600 mb-6">
          If you accept this quote, you'll be asked to provide some details so we can process your sale.
        </p>

        <div className="flex gap-4">
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
          >
            <Check className="h-5 w-5 mr-2" />
            {accepting ? "Processing..." : "Accept Quote"}
          </Button>

          <Button
            onClick={handleDecline}
            disabled={accepting}
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 py-6 text-lg"
          >
            <X className="h-5 w-5 mr-2" />
            Decline Quote
          </Button>
        </div>

        {quote.expiresAt && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            This quote expires on {new Date(quote.expiresAt).toLocaleDateString()}
          </p>
        )}
      </Card>
    </div>
  )
}
```

---

### Task 3: Accept Redirect Page

**File:** `app/(public)/quote/[token]/accept/page.tsx` (NEW)

```typescript
"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function AcceptRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  useEffect(() => {
    // Redirect to details form
    router.push(`/quote/${token}/details`)
  }, [token, router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to details form...</p>
      </div>
    </div>
  )
}
```

---

### Task 4: Decline Page

**File:** `app/(public)/quote/[token]/declined/page.tsx` (NEW)

```typescript
"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle } from "lucide-react"

export default function DeclinedPage() {
  const params = useParams()
  const token = params.token as string

  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/quote-confirmation/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined })
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert("Failed to submit. Please try again.")
      }
    } catch (err) {
      alert("Failed to submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You</h2>
        <p className="text-gray-600 mb-4">
          We've received your response. We appreciate you taking the time to review our offer.
        </p>
        <p className="text-sm text-gray-500">
          If you change your mind or have any questions, please don't hesitate to contact us.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Decline Quote</h1>
        <p className="text-gray-600">
          We're sorry to hear you're declining our offer. Your feedback helps us improve!
        </p>
      </Card>

      <Card className="p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Would you like to tell us why? (Optional)
        </label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Price too low, found a better offer, changed my mind..."
          rows={4}
          className="w-full"
        />

        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
          <Button
            onClick={() => handleSubmit()}
            variant="outline"
            className="flex-1"
            disabled={submitting}
          >
            Skip
          </Button>
        </div>
      </Card>
    </div>
  )
}
```

---

## 📱 Mobile Responsiveness

Ensure all pages are mobile-friendly:
- Use Tailwind's responsive classes (`md:`, `lg:`)
- Test on mobile devices
- Ensure buttons are large enough for touch
- Stack elements vertically on small screens

---

## ✅ Completion Checklist

- [ ] Created public layout
- [ ] Created quote review page
- [ ] Created accept redirect page
- [ ] Created decline page
- [ ] Added loading states
- [ ] Added error handling
- [ ] Tested on desktop
- [ ] Tested on mobile
- [ ] Tested with invalid tokens
- [ ] Tested with expired tokens
- [ ] Committed changes to git

---

## 🧪 Testing Checklist

Test these scenarios:

- [ ] Valid token displays quote correctly
- [ ] Invalid token shows error message
- [ ] Expired token shows error message
- [ ] Accept button redirects to details form
- [ ] Decline button redirects to decline page
- [ ] Decline submission works with/without reason
- [ ] Mobile layout looks good
- [ ] Images load and display correctly
- [ ] Prices format correctly

---

## 📝 Git Backup

```bash
git add app/\(public\)
git commit -m "Phase 4 Complete: Public quote review pages"
git tag -a quote-workflow-phase-4-complete -m "Public pages for quote review"
```

---

**Phase Status:** 🔴 Not Started  
**Next Phase:** `PHASE_5_CLIENT_FORM.md`
