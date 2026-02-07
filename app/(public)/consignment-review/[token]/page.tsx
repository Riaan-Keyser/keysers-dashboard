"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, DollarSign, Calendar, TrendingDown } from "lucide-react"

interface ChangeRequest {
  id: string
  equipment: {
    id: string
    sku: string
    name: string
    brand: string
    model: string
    images: string[]
  }
  currentPayout: number | null
  proposedPayout: number | null
  currentEndDate: string | null
  proposedEndDate: string | null
  status: string
}

export default function ConsignmentReviewPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [adjustedPayout, setAdjustedPayout] = useState("")
  const [acceptingAsIs, setAcceptingAsIs] = useState(false)

  useEffect(() => {
    fetchChangeRequest()
  }, [token])

  const fetchChangeRequest = async () => {
    try {
      const response = await fetch(`/api/consignment-review/${token}`)
      if (!response.ok) {
        throw new Error("Invalid or expired link")
      }

      const data = await response.json()
      setChangeRequest(data.changeRequest)
      setAdjustedPayout(data.changeRequest.proposedPayout?.toString() || "")
    } catch (err) {
      setError("This link is invalid or has expired")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (acceptAsIs: boolean) => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/consignment-review/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptAsIs,
          adjustedPayout: acceptAsIs ? null : parseFloat(adjustedPayout),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit")
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your response has been recorded. We'll process your confirmation and be in touch shortly.
          </p>
          <p className="text-sm text-gray-500">
            Questions? Call us at 072 392 6372
          </p>
        </Card>
      </div>
    )
  }

  if (!changeRequest) return null

  const profit = changeRequest.proposedPayout && changeRequest.currentPayout
    ? ((changeRequest.proposedPayout - changeRequest.currentPayout) / changeRequest.currentPayout * 100).toFixed(1)
    : "0"

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Consignment Terms Review</h1>
          <p className="text-gray-600">Please review and confirm the proposed changes</p>
        </div>

        {/* Equipment Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            {changeRequest.equipment.images[0] && (
              <img
                src={changeRequest.equipment.images[0]}
                alt={changeRequest.equipment.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{changeRequest.equipment.name}</h2>
              <p className="text-gray-600">{changeRequest.equipment.brand} {changeRequest.equipment.model}</p>
              <p className="text-sm text-gray-500 mt-1">SKU: {changeRequest.equipment.sku}</p>
            </div>
          </div>
        </Card>

        {/* Proposed Changes */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Proposed Changes</h3>

          {changeRequest.proposedPayout && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Payout Amount</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-lg font-bold text-gray-900">
                    R {changeRequest.currentPayout?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Proposed</p>
                  <p className="text-lg font-bold text-green-600">
                    R {changeRequest.proposedPayout.toLocaleString()}
                  </p>
                  {Number(profit) !== 0 && (
                    <p className={`text-xs ${Number(profit) > 0 ? "text-green-600" : "text-red-600"}`}>
                      {Number(profit) > 0 ? "+" : ""}{profit}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {changeRequest.proposedEndDate && (
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-900">Consignment End Date</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {new Date(changeRequest.proposedEndDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </Card>

        {/* Response Options */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Response</h3>

          {/* Option 1: Accept As-Is */}
          <div className="mb-6">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              size="lg"
              className="w-full"
            >
              {submitting && acceptingAsIs ? "Submitting..." : "Accept Proposed Terms"}
            </Button>
          </div>

          {/* Option 2: Request Lower Payout */}
          {changeRequest.proposedPayout && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <Label className="text-base font-semibold">Or Request a Lower Payout</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                You may request a payout amount lower than the proposed amount (you cannot request more).
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={adjustedPayout}
                    onChange={(e) => setAdjustedPayout(e.target.value)}
                    placeholder="Enter amount"
                    max={changeRequest.proposedPayout}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: R {changeRequest.proposedPayout.toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={
                    submitting ||
                    !adjustedPayout ||
                    parseFloat(adjustedPayout) <= 0 ||
                    parseFloat(adjustedPayout) > changeRequest.proposedPayout
                  }
                >
                  {submitting && !acceptingAsIs ? "Submitting..." : "Submit Counter-Offer"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-sm text-gray-500">
          Questions? Call us at 072 392 6372 or email info@keysers.co.za
        </p>
      </div>
    </div>
  )
}
