"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Truck, CheckCircle, AlertCircle } from "lucide-react"

const COURIER_COMPANIES = [
  "The Courier Guy",
  "DHL",
  "Aramex",
  "FedEx",
  "Dawn Wing",
  "PostNet",
  "PUDO",
  "Other"
]

export default function ShippingTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [courierCompany, setCourierCompany] = useState("")
  const [customCourier, setCustomCourier] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!courierCompany) {
      setError("Please select a courier company")
      return
    }

    if (courierCompany === "Other" && !customCourier.trim()) {
      setError("Please specify the courier company name")
      return
    }

    if (!trackingNumber.trim()) {
      setError("Please enter your tracking number")
      return
    }

    setSubmitting(true)

    try {
      const finalCourier = courierCompany === "Other" ? customCourier.trim() : courierCompany

      const response = await fetch(`/api/quote-confirmation/${token}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierCompany: finalCourier,
          trackingNumber: trackingNumber.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to submit tracking information")
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError("Failed to submit tracking information. Please try again.")
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tracking Info Received!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for providing your tracking information. We'll monitor the delivery and notify you as soon as your gear arrives.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
          <h3 className="font-bold text-gray-900 mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ We'll track your shipment</li>
            <li>✓ You'll receive an email when your gear arrives</li>
            <li>✓ We'll inspect each item carefully</li>
            <li>✓ You'll get a final quote within 48-72 hours</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          If you have any questions, contact us at <a href="mailto:admin@keysers.co.za" className="text-blue-600 hover:underline">admin@keysers.co.za</a>
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Tracking Information</h1>
            <p className="text-gray-600">Help us track your shipment</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Truck className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Important:</strong> Please ensure your gear is securely packaged and insured. Include all accessories (chargers, batteries, straps, etc.) mentioned in your original submission.
            </div>
          </div>

          <div>
            <Label htmlFor="courierCompany">Courier Company *</Label>
            <select
              id="courierCompany"
              value={courierCompany}
              onChange={(e) => setCourierCompany(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a courier company</option>
              {COURIER_COMPANIES.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          {courierCompany === "Other" && (
            <div>
              <Label htmlFor="customCourier">Courier Company Name *</Label>
              <Input
                id="customCourier"
                value={customCourier}
                onChange={(e) => setCustomCourier(e.target.value)}
                placeholder="Enter courier company name"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="trackingNumber">Tracking/Waybill Number *</Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g., TCG123456789 or DHL987654321"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              You should have received this from your courier after booking the shipment
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Submitting..." : "Submit Tracking Info"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-bold text-gray-900 mb-3">📍 Our Shipping Address</h3>
        <div className="text-gray-700">
          <strong>Keysers Camera Equipment</strong><br />
          65 Tennant Street<br />
          Windsor Park, Kraaifontein<br />
          7570<br />
          South Africa
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Make sure your shipment is addressed to this location
        </p>
      </Card>
    </div>
  )
}
