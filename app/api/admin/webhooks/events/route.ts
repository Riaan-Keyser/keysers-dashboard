import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// GET /api/admin/webhooks/events
// Supports filtering by status, eventType, search query
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "FAILED"
    const eventType = searchParams.get("eventType") || undefined
    const q = searchParams.get("q") || undefined
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "50")

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: Prisma.WebhookEventLogWhereInput = {}

    if (status) {
      where.status = status as any
    }

    if (eventType) {
      where.eventType = eventType
    }

    // Search by eventId or payload content (basic JSON search)
    if (q && q.trim()) {
      where.OR = [
        { eventId: { contains: q, mode: "insensitive" } },
        // Search in rawPayload for phone/email/name
        { rawPayload: { path: ["payload", "customerPhone"], string_contains: q } },
        { rawPayload: { path: ["payload", "customerEmail"], string_contains: q } },
        { rawPayload: { path: ["payload", "customerName"], string_contains: q } },
        { rawPayload: { path: ["customerPhone"], string_contains: q } },
        { rawPayload: { path: ["customerEmail"], string_contains: q } },
        { rawPayload: { path: ["customerName"], string_contains: q } }
      ]
    }

    // Default: exclude ignored events when filtering by FAILED
    if (status === "FAILED" && !searchParams.has("includeIgnored")) {
      where.ignoredAt = null
    }

    const [events, total] = await Promise.all([
      prisma.webhookEventLog.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: pageSize,
        skip,
        select: {
          id: true,
          eventId: true,
          eventType: true,
          version: true,
          status: true,
          receivedAt: true,
          processedAt: true,
          signatureValid: true,
          errorMessage: true,
          retryCount: true,
          lastRetriedAt: true,
          ignoredAt: true,
          ignoredByUserId: true,
          relatedEntityId: true,
          relatedEntityType: true
        }
      }),
      prisma.webhookEventLog.count({ where })
    ])

    return NextResponse.json({
      events,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error: any) {
    console.error("Failed to fetch webhook events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events", details: error.message },
      { status: 500 }
    )
  }
}
