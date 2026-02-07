import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"

// POST /api/incoming-gear/create-walkin - Create walk-in client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, email } = body

    // Validation
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "First name, last name, and phone are required" },
        { status: 400 }
      )
    }

    // Check if Client already exists by phone or email
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          { phone },
          email ? { email } : { phone: "IMPOSSIBLE_MATCH" }, // Only check email if provided
        ],
      },
    })

    // Create client if doesn't exist
    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName,
          lastName,
          phone,
          email: email || null,
        },
      })
      console.log(`✅ Created new client: ${client.id}`)
    } else {
      console.log(`✅ Found existing client: ${client.id}`)
    }

    // Generate tracking token for quote confirmation flow
    const trackingToken = generateConfirmationToken()

    // Create PendingPurchase without bot origin
    const purchase = await prisma.pendingPurchase.create({
      data: {
        customerName: `${firstName} ${lastName}`,
        customerPhone: phone,
        customerEmail: email || null,
        quoteConfirmationToken: trackingToken,
        quoteTokenExpiresAt: getTokenExpiry(),
        status: "AWAITING_DELIVERY", // Skip delivery selection for walk-ins
      },
    })

    // Create inspection session immediately
    const inspectionSession = await prisma.inspectionSession.create({
      data: {
        sessionName: `Walk-in: ${firstName} ${lastName} - ${new Date().toLocaleDateString()}`,
        status: "IN_PROGRESS",
        createdById: session.user.id,
      },
    })

    // Link inspection session to purchase
    // For walk-ins, mark as received AND notified immediately (no undo countdown)
    const now = new Date()
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        inspectionSessionId: inspectionSession.id,
        gearReceivedAt: now, // Mark as received immediately for walk-ins
        gearReceivedByUserId: session.user.id,
        clientNotifiedAt: now, // Mark as notified immediately to skip undo countdown
        status: "INSPECTION_IN_PROGRESS",
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_WALKIN_CLIENT",
        entityType: "PENDING_PURCHASE",
        entityId: purchase.id,
        details: JSON.stringify({
          customerName: `${firstName} ${lastName}`,
          phone,
          email,
          clientId: client.id,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      inspectionSessionId: inspectionSession.id,
      clientId: client.id,
    })
  } catch (error) {
    console.error("Failed to create walk-in client:", error)
    return NextResponse.json(
      { error: "Failed to create walk-in client" },
      { status: 500 }
    )
  }
}
