"use client"

import { useEffect, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, MapPin } from "lucide-react"

interface DeliveryBooking {
  id: string
  deliveryMethod: string
  requestedDate: string | null
  requestedTime: string | null
  status: string
  trackingNumber: string | null
  courierName: string | null
  purchases: Array<{
    id: string
    customerName: string
    customerPhone: string
    customerEmail: string | null
  }>
  createdAt: string
}

interface CalendarAvailability {
  id: string
  dayOfWeek: number | null
  startTime: string | null
  endTime: string | null
  isAvailable: boolean
  specificDate: string | null
  blockReason: string | null
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function CalendarPage() {
  const [bookings, setBookings] = useState<DeliveryBooking[]>([])
  const [availability, setAvailability] = useState<CalendarAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  useEffect(() => {
    fetchBookings()
    fetchAvailability()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/delivery-bookings")
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    try {
      const response = await fetch("/api/calendar/availability")
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error)
    }
  }

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/delivery-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" })
      })

      if (response.ok) {
        fetchBookings()
        alert("Booking confirmed! Confirmation email will be sent to the client.")
      }
    } catch (error) {
      console.error("Failed to confirm booking:", error)
      alert("Failed to confirm booking")
    }
  }

  const handleDeclineBooking = async (bookingId: string) => {
    const reason = prompt("Reason for declining (optional):")
    try {
      const response = await fetch(`/api/delivery-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DECLINED", declineReason: reason })
      })

      if (response.ok) {
        fetchBookings()
        alert("Booking declined")
      }
    } catch (error) {
      console.error("Failed to decline booking:", error)
      alert("Failed to decline booking")
    }
  }

  const pendingBookings = bookings.filter(b => b.status === "PENDING")
  const confirmedBookings = bookings.filter(b => b.status === "CONFIRMED")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Delivery Calendar</h1>
        <p className="text-gray-500 mt-1">Manage delivery bookings and availability</p>
      </div>

      {/* Pending Bookings Alert */}
      {pendingBookings.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                {pendingBookings.length} booking{pendingBookings.length !== 1 ? "s" : ""} awaiting confirmation
              </p>
              <p className="text-sm text-amber-700">Review and confirm delivery requests below</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar View */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Calendar</h2>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-sm">Legend:</h3>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Blocked</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>Booked</span>
            </div>
          </div>
        </Card>

        {/* Availability Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Working Hours</h2>
          <div className="space-y-4">
            {DAY_NAMES.map((day, index) => {
              const dayAvail = availability.find(a => a.dayOfWeek === index)
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{day}</span>
                  {dayAvail ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {dayAvail.startTime} - {dayAvail.endTime}
                      </span>
                      <Badge variant="success">Open</Badge>
                    </div>
                  ) : (
                    <Badge variant="default">Not Set</Badge>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Contact an administrator to modify working hours
          </p>
        </Card>
      </div>

      {/* Pending Delivery Requests */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Pending Delivery Requests</h2>
        {pendingBookings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No pending delivery requests</p>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="warning">Pending</Badge>
                      {booking.deliveryMethod === "SELF_DELIVER" && (
                        <Badge variant="info">
                          <MapPin className="h-3 w-3 mr-1" />
                          Self-Deliver
                        </Badge>
                      )}
                      {booking.deliveryMethod === "COURIER" && (
                        <Badge variant="default">Courier</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">
                      {booking.purchases[0]?.customerName}
                    </h3>
                    <p className="text-sm text-gray-600">{booking.purchases[0]?.customerPhone}</p>
                    {booking.purchases[0]?.customerEmail && (
                      <p className="text-sm text-gray-600">{booking.purchases[0]?.customerEmail}</p>
                    )}
                    {booking.requestedDate && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span>{new Date(booking.requestedDate).toLocaleDateString()}</span>
                        {booking.requestedTime && (
                          <>
                            <Clock className="h-4 w-4 text-gray-400 ml-2" />
                            <span>{booking.requestedTime}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfirmBooking(booking.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeclineBooking(booking.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirmed Bookings */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Confirmed Deliveries</h2>
        {confirmedBookings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No confirmed deliveries</p>
        ) : (
          <div className="space-y-4">
            {confirmedBookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="success">Confirmed</Badge>
                      {booking.deliveryMethod === "SELF_DELIVER" && (
                        <Badge variant="info">Self-Deliver</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">
                      {booking.purchases[0]?.customerName}
                    </h3>
                    <p className="text-sm text-gray-600">{booking.purchases[0]?.customerPhone}</p>
                    {booking.requestedDate && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {new Date(booking.requestedDate).toLocaleDateString()}
                        </span>
                        {booking.requestedTime && (
                          <>
                            <Clock className="h-4 w-4 text-gray-400 ml-2" />
                            <span className="font-medium">{booking.requestedTime}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
