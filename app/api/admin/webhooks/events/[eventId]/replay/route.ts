import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processWebhookEvent } from "@/lib/webhook-processing"

// POST /api/admin/webhooks/events/:eventId/replay
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
    const mode = body.mode || "safe"
    const note = body.note

    // Fetch event log
    const event = await prisma.webhookEventLog.findUnique({
      where: { eventId }
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Only allow replay when status is FAILED or PROCESSED (to fix issues)
    if (!["FAILED", "PROCESSED"].includes(event.status)) {
      return NextResponse.json(
        {
          error: "Cannot replay event",
          reason: `Event status is ${event.status}. Only FAILED or PROCESSED events can be replayed.`
        },
        { status: 400 }
      )
    }

    // Don't allow replay of ignored events
    if (event.ignoredAt) {
      return NextResponse.json(
        {
          error: "Cannot replay ignored event",
          reason: "Event has been marked as ignored. Unignore it first if you want to replay."
        },
        { status: 400 }
      )
    }

    // Replay: call the processing function
    console.log(`🔁 Replaying webhook event ${eventId} (mode: ${mode}, admin: ${session.user.email})`)

    const result = await processWebhookEvent({
      eventId: event.eventId,
      eventType: event.eventType,
      version: event.version,
      rawPayload: event.rawPayload
    })

    // Update event log with replay result
    if (result.ok) {
      await prisma.webhookEventLog.update({
        where: { eventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: result.noop
            ? `Replay completed (noop): ${result.message}`
            : `Replay successful: ${result.message}`,
          relatedEntityId: result.relatedEntityId || event.relatedEntityId,
          relatedEntityType: result.relatedEntityType || event.relatedEntityType,
          retryCount: { increment: 1 },
          lastRetriedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        noop: result.noop || false,
        message: result.message,
        relatedEntityId: result.relatedEntityId,
        relatedEntityType: result.relatedEntityType
      })
    } else {
      // Replay failed, update error message but keep FAILED status
      await prisma.webhookEventLog.update({
        where: { eventId },
        data: {
          errorMessage: `Replay failed: ${result.message}`,
          retryCount: { increment: 1 },
          lastRetriedAt: new Date()
        }
      })

      return NextResponse.json({
        success: false,
        message: result.message,
        errorDetails: result.errorDetails
      })
    }
  } catch (error: any) {
    console.error("Failed to replay webhook event:", error)
    return NextResponse.json(
      { error: "Failed to replay event", details: error.message },
      { status: 500 }
    )
  }
}
