import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await params

    // Check if this is an IncomingGearItem (inspection in progress)
    const incomingItem = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: {
        verifiedItem: true,
        session: {
          include: {
            pendingPurchase: true
          }
        }
      }
    })

    if (incomingItem) {
      // Delete the IncomingGearItem (Prisma will cascade delete VerifiedGearItem and related records)
      await prisma.incomingGearItem.delete({
        where: { id: itemId }
      })

      // Keep the inspection session active even if all items are removed
      // This allows users to add more products without restarting the inspection

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "DELETED_INCOMING_ITEM",
          entityType: "INCOMING_GEAR_ITEM",
          entityId: itemId,
          details: JSON.stringify({
            itemName: incomingItem.clientName
          })
        }
      })

      return NextResponse.json({ success: true })
    }

    // Check if this is a PendingItem (not yet inspected)
    const pendingItem = await prisma.pendingItem.findUnique({
      where: { id: itemId },
      include: {
        pendingPurchase: true
      }
    })

    if (pendingItem) {
      await prisma.pendingItem.delete({
        where: { id: itemId }
      })

      // Check if this was the last item in the pending purchase
      const remainingItems = await prisma.pendingItem.count({
        where: { pendingPurchaseId: pendingItem.pendingPurchaseId }
      })

      // If no items left, delete the pending purchase
      if (remainingItems === 0) {
        await prisma.pendingPurchase.delete({
          where: { id: pendingItem.pendingPurchaseId }
        })
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "DELETED_PENDING_ITEM",
          entityType: "PENDING_ITEM",
          entityId: itemId,
          details: JSON.stringify({
            itemName: pendingItem.name
          })
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  } catch (error: any) {
    console.error("DELETE /api/incoming-gear/items/[itemId] error:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    return NextResponse.json({ 
      error: "Failed to delete item", 
      details: error.message 
    }, { status: 500 })
  }
}
