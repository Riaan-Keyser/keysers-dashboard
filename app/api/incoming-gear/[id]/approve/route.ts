import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Get the pending purchase with all items
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

    // Create equipment for each approved item
    const createdEquipment = []
    for (const item of purchase.items) {
      if (item.status === "APPROVED" || item.status === "PRICE_ADJUSTED") {
        const equipment = await prisma.equipment.create({
          data: {
            name: item.name,
            brand: item.brand || "Unknown",
            model: item.model || "",
            category: (item.category as any) || "OTHER",
            condition: (item.condition as any) || "GOOD",
            description: item.description,
            serialNumber: item.serialNumber,
            acquisitionType: "PURCHASED_OUTRIGHT",
            vendorId: purchase.vendorId,
            purchasePrice: item.finalPrice || item.proposedPrice,
            sellingPrice: item.suggestedSellPrice || ((item.finalPrice || item.proposedPrice || 0) * 1.3),
            status: "PENDING_INSPECTION",
            images: item.imageUrls,
            createdById: session.user.id
          }
        })

        // Update pending item with equipment ID
        await prisma.pendingItem.update({
          where: { id: item.id },
          data: {
            equipmentId: equipment.id,
            status: "ADDED_TO_INVENTORY"
          }
        })

        createdEquipment.push(equipment)
      }
    }

    // Update purchase status to APPROVED (moves to Awaiting Payment)
    await prisma.pendingPurchase.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date()
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "APPROVED_PURCHASE_AWAITING_PAYMENT",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          itemsPrepared: createdEquipment.length
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: "Purchase approved and moved to Awaiting Payment",
      itemsPrepared: createdEquipment.length,
      equipment: createdEquipment
    })
  } catch (error) {
    console.error("POST /api/incoming-gear/[id]/approve error:", error)
    return NextResponse.json({ error: "Failed to approve purchase" }, { status: 500 })
  }
}
