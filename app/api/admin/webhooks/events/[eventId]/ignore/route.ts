import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/admin/webhooks/events/:eventId/ignore
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  try {
    const { eventId } = params
    const body = await request.json()
    const note = body.note

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Ignore note is required" },
        { status: 400 }
      )
    }

    // Fetch event log
    const event = await prisma.webhookEventLog.findUnique({
      where: { eventId }
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Update event to mark as ignored
    await prisma.webhookEventLog.update({
      where: { eventId },
      data: {
        ignoredAt: new Date(),
        ignoredByUserId: session.user.id,
        ignoreNote: note.trim()
      }
    })

    console.log(`🔕 Webhook event ${eventId} ignored by ${session.user.email}: ${note}`)

    return NextResponse.json({
      success: true,
      message: "Event marked as ignored"
    })
  } catch (error: any) {
    console.error("Failed to ignore webhook event:", error)
    return NextResponse.json(
      { error: "Failed to ignore event", details: error.message },
      { status: 500 }
    )
  }
}
