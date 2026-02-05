import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendGearReceivedEmail } from "@/lib/email"

/**
 * Send gear received notification to client
 * Only if 10 minutes have passed and not already notified
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

    // Check if gear was marked as received
    if (!purchase.gearReceivedAt) {
      return NextResponse.json({ 
        error: "Gear not marked as received" 
      }, { status: 400 })
    }

    // Check if already notified
    if (purchase.clientNotifiedAt) {
      return NextResponse.json({ 
        error: "Client already notified",
        notifiedAt: purchase.clientNotifiedAt
      }, { status: 400 })
    }

    // Check if 10 minutes have passed
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    if (purchase.gearReceivedAt > tenMinutesAgo) {
      const minutesRemaining = Math.ceil((purchase.gearReceivedAt.getTime() - tenMinutesAgo.getTime()) / (60 * 1000))
      return NextResponse.json({ 
        error: `Cannot notify yet - ${minutesRemaining} minute(s) remaining`,
        canNotifyAt: new Date(purchase.gearReceivedAt.getTime() + 10 * 60 * 1000).toISOString()
      }, { status: 400 })
    }

    // Send notification email
    if (purchase.customerEmail) {
      await sendGearReceivedEmail({
        customerName: purchase.customerName,
        customerEmail: purchase.customerEmail,
        itemCount: purchase.items.length
      })
    }

    // Update notification timestamp
    const updated = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        clientNotifiedAt: new Date()
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CLIENT_NOTIFIED_GEAR_RECEIVED",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          customerEmail: purchase.customerEmail,
          itemCount: purchase.items.length,
          receivedAt: purchase.gearReceivedAt.toISOString(),
          notifiedAt: new Date().toISOString()
        })
      }
    })

    console.log(`📧 Client notified: ${purchase.customerName} (${purchase.customerEmail})`)

    return NextResponse.json({
      success: true,
      message: "Client notified successfully",
      purchase: updated
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/notify-client error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to notify client" 
    }, { status: 500 })
  }
}
