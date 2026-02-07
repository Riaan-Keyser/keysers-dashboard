import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/delivery-bookings - List delivery bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = {}
    if (status) {
      where.status = status
    }

    const bookings = await prisma.deliveryBooking.findMany({
      where,
      include: {
        purchases: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Failed to fetch delivery bookings:", error)
    return NextResponse.json(
      { error: "Failed to fetch delivery bookings" },
      { status: 500 }
    )
  }
}

// POST /api/delivery-bookings - Create delivery booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchaseId, deliveryMethod, requestedDate, requestedTime, trackingNumber, courierName } = body

    // Create delivery booking
    const booking = await prisma.deliveryBooking.create({
      data: {
        deliveryMethod,
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        requestedTime,
        trackingNumber,
        courierName,
        status: "PENDING",
      },
    })

    // Link to purchase if purchaseId provided
    if (purchaseId) {
      await prisma.pendingPurchase.update({
        where: { id: purchaseId },
        data: {
          deliveryBookingId: booking.id,
        },
      })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Failed to create delivery booking:", error)
    return NextResponse.json(
      { error: "Failed to create delivery booking" },
      { status: 500 }
    )
  }
}
