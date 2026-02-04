import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendGearReceivedEmail } from "@/lib/email"

/**
 * Mark gear as received (staff only)
 * Sends confirmation email to client
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

    // Check if tracking number exists
    if (!purchase.trackingNumber) {
      return NextResponse.json({ 
        error: "Cannot mark as received: No tracking information submitted yet" 
      }, { status: 400 })
    }

    // Check if already marked as received
    if (purchase.gearReceivedAt) {
      return NextResponse.json({ 
        error: "Gear already marked as received" 
      }, { status: 400 })
    }

    // Update purchase
    const updated = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        gearReceivedAt: new Date(),
        gearReceivedByUserId: session.user.id,
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
          receivedBy: session.user.name
        })
      }
    })

    // Send confirmation email to client
    if (purchase.customerEmail) {
      await sendGearReceivedEmail({
        customerName: purchase.customerName,
        customerEmail: purchase.customerEmail,
        itemCount: purchase.items.length
      })
    }

    console.log(`✅ Gear marked as received for ${purchase.customerName} by ${session.user.name}`)

    return NextResponse.json({
      success: true,
      message: "Gear marked as received and client notified",
      purchase: updated
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/mark-received error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to mark gear as received" 
    }, { status: 500 })
  }
}
