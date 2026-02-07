import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/calendar/availability - Get availability settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const availability = await prisma.calendarAvailability.findMany({
      orderBy: [
        { dayOfWeek: "asc" },
        { specificDate: "asc" },
      ],
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error("Failed to fetch availability:", error)
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }
}

// POST /api/calendar/availability - Create availability rule
export async function POST(request: NextRequest) {
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
    const { dayOfWeek, startTime, endTime, isAvailable, specificDate, blockReason } = body

    const availability = await prisma.calendarAvailability.create({
      data: {
        dayOfWeek,
        startTime,
        endTime,
        isAvailable,
        specificDate: specificDate ? new Date(specificDate) : null,
        blockReason,
      },
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error("Failed to create availability:", error)
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    )
  }
}
