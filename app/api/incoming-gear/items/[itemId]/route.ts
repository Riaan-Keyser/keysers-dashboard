import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = params

    // Check if this is an IncomingGearItem (inspection in progress)
    const incomingItem = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: {
        verifiedItem: true,
        inspectionSession: {
          include: {
            pendingPurchase: true
          }
        }
      }
    })

    if (incomingItem) {
      // Delete the VerifiedGearItem and all related records first if it exists
      if (incomingItem.verifiedItem) {
        const verifiedItemId = incomingItem.verifiedItem.id
        
        // Delete all related records in the correct order
        await prisma.verifiedAnswer.deleteMany({
          where: { verifiedGearItemId: verifiedItemId }
        })
        
        await prisma.verifiedAccessory.deleteMany({
          where: { verifiedGearItemId: verifiedItemId }
        })
        
        await prisma.priceOverride.deleteMany({
          where: { verifiedGearItemId: verifiedItemId }
        })
        
        await prisma.pricingSnapshot.deleteMany({
          where: { verifiedGearItemId: verifiedItemId }
        })
        
        await prisma.verifiedGearItem.delete({
          where: { id: verifiedItemId }
        })
      }

      // Delete the IncomingGearItem
      await prisma.incomingGearItem.delete({
        where: { id: itemId }
      })

      // Check if this was the last item in the inspection session
      const remainingItems = await prisma.incomingGearItem.count({
        where: { inspectionSessionId: incomingItem.inspectionSessionId }
      })

      // If no items left, delete the inspection session and update purchase status
      if (remainingItems === 0 && incomingItem.inspectionSession) {
        await prisma.inspectionSession.delete({
          where: { id: incomingItem.inspectionSessionId }
        })

        // Update purchase status back to PENDING_REVIEW
        if (incomingItem.inspectionSession.pendingPurchase) {
          await prisma.pendingPurchase.update({
            where: { id: incomingItem.inspectionSession.pendingPurchase.id },
            data: {
              status: "PENDING_REVIEW",
              inspectionSessionId: null
            }
          })
        }
      }

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
  } catch (error) {
    console.error("DELETE /api/incoming-gear/items/[itemId] error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
