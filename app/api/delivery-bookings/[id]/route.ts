import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/delivery-bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const booking = await prisma.deliveryBooking.findUnique({
      where: { id: params.id },
      include: {
        purchases: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Failed to fetch delivery booking:", error)
    return NextResponse.json(
      { error: "Failed to fetch delivery booking" },
      { status: 500 }
    )
  }
}

// PATCH /api/delivery-bookings/[id] - Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status, trackingNumber, declineReason } = body

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === "CONFIRMED") {
        updateData.confirmedAt = new Date()
        updateData.confirmedByUserId = session.user.id
      } else if (status === "DECLINED") {
        updateData.declinedAt = new Date()
        updateData.declineReason = declineReason
      }
    }
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber
    }

    const booking = await prisma.deliveryBooking.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Failed to update delivery booking:", error)
    return NextResponse.json(
      { error: "Failed to update delivery booking" },
      { status: 500 }
    )
  }
}
