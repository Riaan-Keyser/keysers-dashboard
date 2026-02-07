import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Undo "mark as received" action
 * Only allowed within 10 minutes of marking as received
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
      where: { id }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Check if gear was marked as received
    if (!purchase.gearReceivedAt) {
      return NextResponse.json({ 
        error: "Gear not marked as received yet" 
      }, { status: 400 })
    }

    // Check if client has already been notified
    if (purchase.clientNotifiedAt) {
      return NextResponse.json({ 
        error: "Cannot undo - client has already been notified" 
      }, { status: 400 })
    }

    // Check if 10 minutes have passed
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    if (purchase.gearReceivedAt < tenMinutesAgo) {
      return NextResponse.json({ 
        error: "Cannot undo - more than 10 minutes have passed" 
      }, { status: 400 })
    }

    // If an inspection session exists, delete it and all its items
    if (purchase.inspectionSessionId) {
      // Delete all incoming gear items first (they cascade delete verified items)
      await prisma.incomingGearItem.deleteMany({
        where: { sessionId: purchase.inspectionSessionId }
      })
      
      // Delete the inspection session
      await prisma.inspectionSession.delete({
        where: { id: purchase.inspectionSessionId }
      })
    }

    // Undo the received status
    const updated = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        gearReceivedAt: null,
        gearReceivedByUserId: null,
        clientNotifiedAt: null,
        inspectionSessionId: null,
        status: "AWAITING_DELIVERY"
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "GEAR_RECEIVED_UNDONE",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          undoneBy: session.user.name,
          originalReceivedAt: purchase.gearReceivedAt.toISOString()
        })
      }
    })

    console.log(`↩️  Gear received status undone for ${purchase.customerName} by ${session.user.name}`)

    return NextResponse.json({
      success: true,
      message: "Gear received status undone successfully",
      purchase: updated
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/undo-received error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to undo received status" 
    }, { status: 500 })
  }
}
