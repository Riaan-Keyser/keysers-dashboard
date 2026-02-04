"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, X, Package, AlertCircle, Clock } from "lucide-react"
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600">Loading your quote...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 md:p-12 text-center">
        <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Quote Not Found</h2>
        <p className="text-lg text-gray-600 mb-6">{error}</p>
        <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-sm text-gray-700 mb-4">
            <strong>Common reasons:</strong>
          </p>
          <ul className="text-sm text-gray-600 text-left space-y-2">
            <li>• The quote link has expired (quotes expire after 7 days)</li>
            <li>• The link is invalid or incomplete</li>
            <li>• The quote has already been responded to</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:admin@keysers.co.za" className="text-blue-600 hover:underline">
            admin@keysers.co.za
          </a>
        </p>
      </Card>
    )
  }

  if (!quote) {
    return null
  }

  const total = quote.totalAmount || quote.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Your Quote from Keysers
        </h1>
        <p className="text-lg text-gray-700">
          Hi <span className="font-semibold">{quote.customerName}</span>, please review our offer below:
        </p>
      </Card>

      {/* Expiry Warning */}
      {isExpired && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-800">
            <Clock className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              This quote has expired. Please contact us to request a new quote.
            </p>
          </div>
        </Card>
      )}

      {/* Items */}
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          Your Items ({quote.items.length})
        </h2>

        <div className="space-y-4">
          {quote.items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                  {item.brand && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{item.brand}</span>
                      {item.model && ` - ${item.model}`}
                    </p>
                  )}
                  {item.condition && (
                    <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Condition: {item.condition}
                    </span>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-3 leading-relaxed">{item.description}</p>
                  )}
                </div>
                <div className="text-right md:ml-6">
                  <p className="text-sm text-gray-500 mb-1">We offer:</p>
                  <p className="text-3xl md:text-4xl font-bold text-green-600">
                    R{item.price ? Number(item.price).toLocaleString() : "TBC"}
                  </p>
                </div>
              </div>

              {/* Image preview */}
              {item.imageUrls.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {item.imageUrls.slice(0, 4).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${item.name} ${i + 1}`}
                      className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 flex-shrink-0 hover:border-blue-400 transition-colors cursor-pointer"
                    />
                  ))}
                  {item.imageUrls.length > 4 && (
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-gray-500">+{item.imageUrls.length - 4}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-8 pt-6 border-t-2 border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 rounded-lg p-6">
            <span className="text-xl md:text-2xl font-bold text-gray-900">Total Offer:</span>
            <span className="text-4xl md:text-5xl font-bold text-green-600">
              R{total.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      {!isExpired && (
        <Card className="p-6 md:p-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-3">What would you like to do?</h3>
          <p className="text-gray-700 mb-6 leading-relaxed">
            If you accept this quote, you'll be asked to provide some details so we can process your sale and arrange payment.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Check className="h-6 w-6 mr-2" />
              {accepting ? "Processing..." : "Accept Quote"}
            </Button>

            <Button
              onClick={handleDecline}
              disabled={accepting}
              variant="outline"
              className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 py-6 text-lg font-semibold transition-all"
            >
              <X className="h-6 w-6 mr-2" />
              Decline Quote
            </Button>
          </div>

          {quote.expiresAt && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 bg-white rounded-lg p-3">
              <Clock className="h-4 w-4" />
              <span>
                This quote expires on <strong>{new Date(quote.expiresAt).toLocaleDateString()}</strong>
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
