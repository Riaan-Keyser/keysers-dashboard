import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateQuoteToken } from "@/lib/token"

// POST /api/quote-confirmation/[token]/delivery - Submit delivery method choice
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    // Validate token
    const purchase = await validateQuoteToken(token)
    if (!purchase) {
      return NextResponse.json(
        { error: "Invalid or expired quote link" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { deliveryMethod, requestedDate, requestedTime, courierName, trackingNumber } = body

    // Create delivery booking
    const booking = await prisma.deliveryBooking.create({
      data: {
        deliveryMethod,
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        requestedTime,
        courierName,
        trackingNumber,
        status: deliveryMethod === "SELF_DELIVER" ? "PENDING" : "CONFIRMED",
      },
    })

    // Link booking to purchase
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        deliveryBookingId: booking.id,
        status: "AWAITING_DELIVERY",
      },
    })

    // If courier without tracking, will be handled by cron job for reminders
    // If self-deliver, staff will confirm/decline in calendar

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      deliveryMethod,
    })
  } catch (error) {
    console.error("Failed to submit delivery information:", error)
    return NextResponse.json(
      { error: "Failed to submit delivery information" },
      { status: 500 }
    )
  }
}
