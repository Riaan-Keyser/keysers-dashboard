import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/webhooks/events/:eventId
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  try {
    const { eventId } = params

    const event = await prisma.webhookEventLog.findUnique({
      where: { eventId }
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error: any) {
    console.error("Failed to fetch webhook event:", error)
    return NextResponse.json(
      { error: "Failed to fetch event", details: error.message },
      { status: 500 }
    )
  }
}
