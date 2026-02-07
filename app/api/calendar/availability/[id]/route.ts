import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/calendar/availability/[id] - Delete availability rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin or manager
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.calendarAvailability.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete availability:", error)
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    )
  }
}

// PATCH /api/calendar/availability/[id] - Update availability rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin or manager
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    const availability = await prisma.calendarAvailability.update({
      where: { id: params.id },
      data: body,
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error("Failed to update availability:", error)
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    )
  }
}
