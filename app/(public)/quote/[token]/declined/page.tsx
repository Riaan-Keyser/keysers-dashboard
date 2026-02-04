"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, X } from "lucide-react"

const DECLINE_REASONS = [
  "Price is too low",
  "Found a better offer elsewhere",
  "Changed my mind about selling",
  "Item condition assessment incorrect",
  "Need more time to decide",
  "Other"
]

export default function DeclinedPage() {
  const params = useParams()
  const token = params.token as string

  const [selectedReason, setSelectedReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const finalReason = selectedReason === "Other" 
        ? customReason 
        : selectedReason

      const response = await fetch(`/api/quote-confirmation/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason || undefined })
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert("Failed to submit. Please try again.")
        setSubmitting(false)
      }
    } catch (err) {
      alert("Failed to submit. Please try again.")
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 md:p-12 text-center">
        <div className="mb-6">
          <div className="rounded-full h-24 w-24 bg-green-100 mx-auto flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Thank You</h2>
        <p className="text-lg text-gray-600 mb-6">
          We've received your response and appreciate you taking the time to review our offer.
        </p>
        <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-sm text-gray-700">
            <strong>Changed your mind?</strong>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            If you'd like to reconsider or have any questions, please don't hesitate to contact us at{" "}
            <a href="mailto:admin@keysers.co.za" className="text-blue-600 hover:underline font-medium">
              admin@keysers.co.za
            </a>
          </p>
        </div>
        <div className="mt-8">
          <a 
            href="https://keysers.co.za" 
            className="text-blue-600 hover:underline text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit our website
          </a>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 md:p-8 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-red-100 p-3 flex-shrink-0">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Decline Quote</h1>
            <p className="text-gray-700">
              We're sorry to hear you're declining our offer. Your feedback helps us improve!
            </p>
          </div>
        </div>
      </Card>

      {/* Feedback Form */}
      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Would you mind telling us why? (Optional)
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Your feedback helps us provide better quotes in the future.
        </p>

        {/* Reason Selection */}
        <div className="space-y-3 mb-6">
          {DECLINE_REASONS.map((reason) => (
            <label
              key={reason}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedReason === reason
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3"
              />
              <span className="text-gray-900">{reason}</span>
            </label>
          ))}
        </div>

        {/* Custom Reason Input */}
        {selectedReason === "Other" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please specify:
            </label>
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell us more about your reason..."
              rows={4}
              className="w-full"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting || (selectedReason === "Other" && !customReason.trim())}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
          <Button
            onClick={() => handleSubmit()}
            variant="outline"
            className="flex-1 py-6 text-lg"
            disabled={submitting}
          >
            Skip Feedback
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Your feedback is anonymous and helps us improve our service.
        </p>
      </Card>

      {/* Additional Info */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Need to talk to us?</h3>
        <p className="text-sm text-gray-600 mb-4">
          If you have questions or would like to negotiate, we're here to help.
        </p>
        <div className="flex flex-col md:flex-row gap-4 text-sm">
          <a 
            href="mailto:admin@keysers.co.za" 
            className="text-blue-600 hover:underline font-medium"
          >
            📧 admin@keysers.co.za
          </a>
          <a 
            href="https://keysers.co.za" 
            className="text-blue-600 hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            🌐 www.keysers.co.za
          </a>
        </div>
      </Card>
    </div>
  )
}
