import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Start inspection session for a pending purchase (Sprint 2)
 * Creates InspectionSession and copies PendingItems to IncomingGearItems
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get the purchase with items
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: {
        items: true,
        vendor: true
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Validation
    if (purchase.status !== "INSPECTION_IN_PROGRESS") {
      return NextResponse.json({ 
        error: "Purchase must be in INSPECTION_IN_PROGRESS status to start inspection" 
      }, { status: 400 })
    }

    if (!purchase.gearReceivedAt) {
      return NextResponse.json({ 
        error: "Gear must be marked as received before starting inspection" 
      }, { status: 400 })
    }

    if (purchase.inspectionSessionId) {
      return NextResponse.json({ 
        error: "Inspection session already exists for this purchase",
        sessionId: purchase.inspectionSessionId
      }, { status: 400 })
    }

    if (purchase.items.length === 0) {
      return NextResponse.json({ 
        error: "No items to inspect" 
      }, { status: 400 })
    }

    // Generate session number
    const sessionCount = await prisma.inspectionSession.count()
    const sessionNumber = `INS-${String(sessionCount + 1).padStart(6, '0')}`

    // Create inspection session
    const inspectionSession = await prisma.inspectionSession.create({
      data: {
        sessionName: `Quote from ${purchase.customerName} - ${new Date().toLocaleDateString()}`,
        shipmentReference: purchase.trackingNumber || undefined,
        vendorId: purchase.vendorId || undefined,
        status: "IN_PROGRESS",
        notes: `Customer Phone: ${purchase.customerPhone}\nCustomer Email: ${purchase.customerEmail || 'Not provided'}\nTracking: ${purchase.trackingNumber || 'Not provided'}`,
        createdById: session.user.id,
        incomingItems: {
          create: purchase.items.map((item) => ({
            clientName: item.name,
            clientBrand: item.brand,
            clientModel: item.model,
            clientCondition: item.condition,
            clientDescription: item.description,
            clientImages: item.imageUrls,
            inspectionStatus: "UNVERIFIED"
          }))
        }
      },
      include: {
        incomingItems: true
      }
    })

    // Link inspection session to purchase
    await prisma.pendingPurchase.update({
      where: { id },
      data: {
        inspectionSessionId: inspectionSession.id
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "INSPECTION_STARTED",
        entityType: "INSPECTION_SESSION",
        entityId: inspectionSession.id,
        details: JSON.stringify({
          purchaseId: purchase.id,
          customerName: purchase.customerName,
          itemCount: purchase.items.length,
          sessionNumber: sessionNumber
        })
      }
    })

    console.log(`✅ Inspection session ${inspectionSession.id} started by ${session.user.name} for purchase ${purchase.id}`)

    return NextResponse.json({
      success: true,
      sessionId: inspectionSession.id,
      sessionName: inspectionSession.sessionName,
      itemCount: inspectionSession.incomingItems.length,
      redirectUrl: `/dashboard/inspections/${inspectionSession.id}`
    }, { status: 201 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/start-inspection error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to start inspection" 
    }, { status: 500 })
  }
}
