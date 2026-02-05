"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, X, Package, AlertCircle, Clock, ChevronRight, CheckCircle2, DollarSign, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface VerifiedItem {
  id: string
  verifiedItemId: string
  clientName: string
  clientDescription: string | null
  productName: string
  productBrand: string | null
  productModel: string | null
  verifiedCondition: string
  serialNumber: string | null
  generalNotes: string | null
  buyPrice: number
  consignPrice: number
  images: string[]
  answers: Array<{
    question: string
    answer: string
    notes: string | null
  }>
  accessories: Array<{
    name: string
    isPresent: boolean
    notes: string | null
  }>
}

interface InspectionData {
  purchase: {
    id: string
    customerName: string
    customerEmail: string | null
    status: string
  }
  inspection: {
    sessionName: string
    status: string
    notes: string | null
    completedAt: string | null
  }
  items: VerifiedItem[]
  expiresAt: string | null
}

type SelectionType = "BUY" | "CONSIGNMENT" | null

export default function SelectProductsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [data, setData] = useState<InspectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Record<string, SelectionType>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchInspectionData()
  }, [token])

  const fetchInspectionData = async () => {
    try {
      const response = await fetch(`/api/quote-confirmation/${token}/inspection`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Failed to load quote")
        setLoading(false)
        return
      }

      setData(result)
      // Initialize all selections as null
      const initialSelections: Record<string, SelectionType> = {}
      result.items.forEach((item: VerifiedItem) => {
        initialSelections[item.id] = null
      })
      setSelections(initialSelections)
      setLoading(false)
    } catch (err: any) {
      setError("Failed to load quote. Please try again.")
      setLoading(false)
    }
  }

  const handleSelectOption = (itemId: string, option: SelectionType) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: option
    }))
  }

  const handleSubmit = async () => {
    // Validate all items have selections
    const hasAllSelections = Object.values(selections).every(sel => sel !== null)
    
    if (!hasAllSelections) {
      alert("Please choose Buy or Consignment for all items before continuing.")
      return
    }

    setSubmitting(true)

    try {
      // Store selections in localStorage for next page
      localStorage.setItem(`quote_selections_${token}`, JSON.stringify(selections))
      
      // Redirect to accept/details page
      router.push(`/quote/${token}/accept`)
    } catch (err) {
      alert("Failed to save your selections. Please try again.")
      setSubmitting(false)
    }
  }

  const formatPrice = (price: number): string => {
    return `R${price.toLocaleString()}`
  }

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      LIKE_NEW: "bg-green-100 text-green-800 border-green-200",
      EXCELLENT: "bg-blue-100 text-blue-800 border-blue-200",
      VERY_GOOD: "bg-cyan-100 text-cyan-800 border-cyan-200",
      GOOD: "bg-yellow-100 text-yellow-800 border-yellow-200",
      WORN: "bg-orange-100 text-orange-800 border-orange-200"
    }
    return colors[condition] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600">Loading your final quote...</p>
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
        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:admin@keysers.co.za" className="text-blue-600 hover:underline">
            admin@keysers.co.za
          </a>
        </p>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const isExpired = data.expiresAt && new Date(data.expiresAt) < new Date()
  const totalBuy = data.items.reduce((sum, item) => sum + item.buyPrice, 0)
  const totalConsign = data.items.reduce((sum, item) => sum + item.consignPrice, 0)
  const allSelected = Object.values(selections).every(sel => sel !== null)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="p-6 md:p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Inspection Complete!
          </h1>
        </div>
        <p className="text-lg text-gray-700">
          Hi <span className="font-semibold">{data.purchase.customerName}</span>, we've finished inspecting your gear. Here's your final quote:
        </p>
        {data.inspection.notes && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Inspector Notes:</p>
            <p className="text-sm text-gray-600">{data.inspection.notes}</p>
          </div>
        )}
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

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">📋 Choose Your Option</h3>
        <p className="text-gray-700 mb-4">
          For each item below, please choose between <strong>Buy</strong> (we purchase immediately) or <strong>Consignment</strong> (we sell on your behalf).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-blue-300">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Buy Option</h4>
            </div>
            <p className="text-sm text-gray-600">
              • Get paid immediately<br />
              • Lower price but instant cash<br />
              • No waiting for sale
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-blue-300">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Consignment</h4>
            </div>
            <p className="text-sm text-gray-600">
              • Higher potential payout<br />
              • We handle the sale<br />
              • Paid when item sells
            </p>
          </div>
        </div>
      </Card>

      {/* Items */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          Your Inspected Items ({data.items.length})
        </h2>

        {data.items.map((item, index) => {
          const selectedOption = selections[item.id]
          
          return (
            <Card key={item.id} className="p-6 md:p-8 hover:shadow-lg transition-shadow">
              {/* Item Header */}
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {item.productName}
                  </h3>
                  {item.productBrand && (
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{item.productBrand}</span>
                      {item.productModel && ` - ${item.productModel}`}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${getConditionColor(item.verifiedCondition)} border`}>
                      {item.verifiedCondition.replace(/_/g, " ")}
                    </Badge>
                    {item.serialNumber && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        S/N: {item.serialNumber}
                      </Badge>
                    )}
                  </div>
                  {item.generalNotes && (
                    <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
                      <strong>Notes:</strong> {item.generalNotes}
                    </p>
                  )}
                </div>

                {/* Images */}
                {item.images.length > 0 && (
                  <div className="flex gap-2">
                    {item.images.slice(0, 2).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${item.productName} ${i + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Option Selection */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* Buy Option */}
                <button
                  onClick={() => handleSelectOption(item.id, "BUY")}
                  disabled={isExpired}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedOption === "BUY"
                      ? "border-green-500 bg-green-50 shadow-lg"
                      : "border-gray-300 hover:border-green-300 hover:bg-green-50"
                  } ${isExpired ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">Buy</h4>
                      <p className="text-xs text-gray-600">Instant Payment</p>
                    </div>
                    {selectedOption === "BUY" && (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                  <p className="text-3xl font-bold text-green-600 mb-1">
                    {formatPrice(item.buyPrice)}
                  </p>
                  <p className="text-xs text-gray-500">Paid immediately</p>
                </button>

                {/* Consignment Option */}
                <button
                  onClick={() => handleSelectOption(item.id, "CONSIGNMENT")}
                  disabled={isExpired}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedOption === "CONSIGNMENT"
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                  } ${isExpired ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">Consignment</h4>
                      <p className="text-xs text-gray-600">Higher Payout</p>
                    </div>
                    {selectedOption === "CONSIGNMENT" && (
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mb-1">
                    {formatPrice(item.consignPrice)}
                  </p>
                  <p className="text-xs text-gray-500">When item sells</p>
                </button>
              </div>

              {/* Accessories & Condition Details */}
              {(item.accessories.length > 0 || item.answers.length > 0) && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                    View Inspection Details
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                    {item.accessories.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Accessories:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {item.accessories.map((acc, i) => (
                            <li key={i} className="flex items-center gap-2">
                              {acc.isPresent ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                              <span>{acc.name}</span>
                              {acc.notes && <span className="text-xs text-gray-500">({acc.notes})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.answers.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Condition Checks:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {item.answers.slice(0, 3).map((ans, i) => (
                            <li key={i}>
                              <strong>{ans.question}:</strong> {ans.answer}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </Card>
          )
        })}
      </div>

      {/* Summary and Continue */}
      {!isExpired && (
        <Card className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 sticky bottom-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Ready to continue?</h3>
              <p className="text-sm text-gray-600">
                {allSelected 
                  ? "Great! All items selected. Click Continue to proceed."
                  : `Please select an option for ${Object.values(selections).filter(s => s === null).length} more item(s).`
                }
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!allSelected || submitting || isExpired}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {submitting ? (
                "Processing..."
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          {data.expiresAt && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600 bg-white rounded-lg p-2">
              <Clock className="h-3 w-3" />
              <span>
                Expires: <strong>{new Date(data.expiresAt).toLocaleDateString()}</strong>
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
