import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendGearReceivedEmail } from "@/lib/email"

/**
 * Mark gear as received (staff only)
 * Client will be notified after 10 minutes (unless undone)
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

    // Get the purchase
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Tracking is optional (some clients drop off in person)
    // Just log if no tracking exists
    if (!purchase.trackingNumber) {
      console.log(`ℹ️  Marking as received without tracking for ${purchase.customerName} (in-person drop-off)`)
    }

    // Update purchase (allow re-marking if undone)
    const updated = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        gearReceivedAt: new Date(),
        gearReceivedByUserId: session.user.id,
        clientNotifiedAt: null, // Reset notification status
        status: "INSPECTION_IN_PROGRESS"
      },
      include: {
        items: true,
        gearReceivedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Auto-create inspection session if items exist and no session yet
    let inspectionSessionId = purchase.inspectionSessionId as string | null
    if (!inspectionSessionId && purchase.items.length > 0) {
      const inspectionSession = await prisma.inspectionSession.create({
        data: {
          sessionName: `Quote from ${purchase.customerName} - ${new Date().toLocaleDateString()}`,
          shipmentReference: purchase.trackingNumber || undefined,
          vendorId: purchase.vendorId || undefined,
          status: "IN_PROGRESS",
          notes: `Customer Phone: ${purchase.customerPhone}\nCustomer Email: ${purchase.customerEmail || 'Not provided'}\nTracking: ${purchase.trackingNumber || 'Not provided'}`,
          createdById: session.user.id,
          incomingItems: {
            create: purchase.items.map((item: any) => ({
              clientName: item.name,
              clientBrand: item.brand,
              clientModel: item.model,
              clientCondition: item.condition,
              clientDescription: item.description,
              clientImages: item.imageUrls || [],
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
        data: { inspectionSessionId: inspectionSession.id }
      })

      inspectionSessionId = inspectionSession.id
      console.log(`✅ Auto-created inspection session ${inspectionSession.id} with ${inspectionSession.incomingItems.length} items`)
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "GEAR_RECEIVED",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          trackingNumber: purchase.trackingNumber,
          courierCompany: purchase.courierCompany,
          itemCount: purchase.items.length,
          receivedBy: session.user.name,
          inspectionSessionId
        })
      }
    })

    // Email will be sent after 10 minutes (via separate endpoint)
    console.log(`✅ Gear marked as received for ${purchase.customerName} by ${session.user.name}. Client will be notified in 10 minutes.`)

    return NextResponse.json({
      success: true,
      message: "Gear marked as received. Client will be notified in 10 minutes.",
      purchase: updated,
      canUndo: true,
      undoExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/mark-received error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to mark gear as received" 
    }, { status: 500 })
  }
}
