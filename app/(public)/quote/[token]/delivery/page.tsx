"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Truck, MapPin, CheckCircle, AlertCircle, Calendar as CalendarIcon } from "lucide-react"

const KEYSERS_ADDRESS = {
  street: "65 Tennant Street",
  suburb: "Windsor Park",
  city: "Kraaifontein",
  postalCode: "7570",
  country: "South Africa",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=65+Tennant+Street,Windsor+Park,Kraaifontein,7570"
}

const TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00"
]

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

export default function DeliveryOptionsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [deliveryMethod, setDeliveryMethod] = useState<"SELF_DELIVER" | "COURIER" | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState("")
  const [courierCompany, setCourierCompany] = useState("")
  const [customCourier, setCustomCourier] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(TIME_SLOTS)

  // Fetch available dates from calendar availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch('/api/calendar/availability')
        if (response.ok) {
          const availability = await response.json()
          // Process availability data to determine available dates
          // For now, allow all future dates (will be refined with actual availability logic)
          const dates: Date[] = []
          for (let i = 1; i <= 30; i++) {
            const date = new Date()
            date.setDate(date.getDate() + i)
            dates.push(date)
          }
          setAvailableDates(dates)
        }
      } catch (err) {
        console.error("Failed to fetch availability:", err)
      }
    }

    fetchAvailability()
  }, [])

  const handleSubmit = async () => {
    setError(null)

    // Validation
    if (!deliveryMethod) {
      setError("Please select a delivery method")
      return
    }

    if (deliveryMethod === "SELF_DELIVER") {
      if (!selectedDate) {
        setError("Please select a delivery date")
        return
      }
      if (!selectedTime) {
        setError("Please select a time slot")
        return
      }
    }

    if (deliveryMethod === "COURIER") {
      if (!courierCompany) {
        setError("Please select a courier company")
        return
      }
      if (courierCompany === "Other" && !customCourier.trim()) {
        setError("Please specify the courier company name")
        return
      }
    }

    setSubmitting(true)

    try {
      // Create delivery booking
      const bookingData: any = {
        deliveryMethod,
      }

      if (deliveryMethod === "SELF_DELIVER") {
        bookingData.requestedDate = selectedDate?.toISOString()
        bookingData.requestedTime = selectedTime
      } else {
        const finalCourier = courierCompany === "Other" ? customCourier.trim() : courierCompany
        bookingData.courierName = finalCourier
        bookingData.trackingNumber = trackingNumber.trim() || null
      }

      // Submit via quote-confirmation API
      const response = await fetch(`/api/quote-confirmation/${token}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to submit delivery information")
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError("Failed to submit delivery information. Please try again.")
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {deliveryMethod === "SELF_DELIVER" ? "Booking Request Received!" : "Information Received!"}
            </h1>
            <p className="text-gray-600 mb-6">
              {deliveryMethod === "SELF_DELIVER" 
                ? "Thank you for your delivery booking request. Our team will review and confirm your selected date and time within 24 hours."
                : "Thank you for providing your courier information. We'll be ready to receive your gear."}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h3 className="font-bold text-gray-900 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {deliveryMethod === "SELF_DELIVER" ? (
                  <>
                    <li>✓ We'll confirm your delivery booking via email</li>
                    <li>✓ You'll receive our address and directions</li>
                    <li>✓ Bring your gear at the confirmed time</li>
                    <li>✓ We'll inspect items and provide a final quote</li>
                  </>
                ) : (
                  <>
                    <li>✓ {trackingNumber ? "We'll track your shipment" : "Add tracking info when available"}</li>
                    <li>✓ You'll receive an email when gear arrives</li>
                    <li>✓ We'll inspect each item carefully</li>
                    <li>✓ You'll get a final quote within 48-72 hours</li>
                  </>
                )}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose Delivery Method</h1>
          <p className="text-gray-600">How would you like to get your gear to us?</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Delivery Method Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`p-6 cursor-pointer transition-all ${
              deliveryMethod === "SELF_DELIVER"
                ? "border-2 border-blue-500 shadow-lg"
                : "hover:border-blue-300"
            }`}
            onClick={() => setDeliveryMethod("SELF_DELIVER")}
          >
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-8 w-8 text-blue-600" />
              <h2 className="text-xl font-bold">I will deliver</h2>
            </div>
            <p className="text-gray-600 mb-4">Bring your gear to our store at a time that suits you</p>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Keysers Camera Equipment</p>
              <p>{KEYSERS_ADDRESS.street}</p>
              <p>{KEYSERS_ADDRESS.suburb}, {KEYSERS_ADDRESS.city}</p>
              <p>{KEYSERS_ADDRESS.postalCode}</p>
            </div>
          </Card>

          <Card
            className={`p-6 cursor-pointer transition-all ${
              deliveryMethod === "COURIER"
                ? "border-2 border-blue-500 shadow-lg"
                : "hover:border-blue-300"
            }`}
            onClick={() => setDeliveryMethod("COURIER")}
          >
            <div className="flex items-center gap-3 mb-4">
              <Truck className="h-8 w-8 text-blue-600" />
              <h2 className="text-xl font-bold">I will use courier</h2>
            </div>
            <p className="text-gray-600 mb-4">Send your gear via courier service</p>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Send to:</p>
              <p>{KEYSERS_ADDRESS.street}</p>
              <p>{KEYSERS_ADDRESS.suburb}, {KEYSERS_ADDRESS.city}</p>
              <p>{KEYSERS_ADDRESS.postalCode}</p>
              <p className="mt-2 text-xs text-gray-500">Mark package as "Fragile - Camera Equipment"</p>
            </div>
          </Card>
        </div>

        {/* Self-Deliver Booking Form */}
        {deliveryMethod === "SELF_DELIVER" && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date & Time
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose your preferred delivery date and time. We'll confirm availability within 24 hours.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Delivery Date</Label>
                <div className="mt-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>
              <div>
                <Label>Time Slot</Label>
                <div className="mt-2 space-y-2">
                  {availableTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`w-full p-3 text-left rounded-lg border transition-all ${
                        selectedTime === slot
                          ? "border-blue-500 bg-blue-50 font-semibold"
                          : "border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Your booking request will be reviewed by our team. You'll receive a confirmation email with directions once approved.
              </p>
            </div>
          </Card>
        )}

        {/* Courier Information Form */}
        {deliveryMethod === "COURIER" && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">Courier Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="courier">Courier Company</Label>
                <select
                  id="courier"
                  value={courierCompany}
                  onChange={(e) => setCourierCompany(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select courier...</option>
                  {COURIER_COMPANIES.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>

              {courierCompany === "Other" && (
                <div>
                  <Label htmlFor="customCourier">Courier Company Name</Label>
                  <Input
                    id="customCourier"
                    value={customCourier}
                    onChange={(e) => setCustomCourier(e.target.value)}
                    placeholder="Enter courier company name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="tracking">Tracking Number (Optional)</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number if available"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Don't have a tracking number yet? That's okay! You can provide it later.
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Important:</strong> Ensure your package is well-protected and marked as "Fragile - Camera Equipment". We recommend insurance for valuable items.
              </p>
            </div>
          </Card>
        )}

        {/* Google Maps Embed */}
        {deliveryMethod && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">Our Location</h3>
            <div className="aspect-video rounded-lg overflow-hidden mb-4">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=65+Tennant+Street,Windsor+Park,Kraaifontein,7570`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
            <a
              href={KEYSERS_ADDRESS.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Open in Google Maps →
            </a>
          </Card>
        )}

        {/* Submit Button */}
        {deliveryMethod && (
          <div className="flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="px-8"
            >
              {submitting ? "Submitting..." : deliveryMethod === "SELF_DELIVER" ? "Request Booking" : "Confirm Delivery Method"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
