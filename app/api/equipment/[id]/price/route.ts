import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncEquipmentToWooCommerce } from "@/lib/woocommerce"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { price, reason } = await request.json()

    // Get current equipment
    const currentEquipment = await prisma.equipment.findUnique({
      where: { id }
    })

    if (!currentEquipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Create price history record
    await prisma.priceHistory.create({
      data: {
        equipmentId: id,
        oldPrice: currentEquipment.sellingPrice,
        newPrice: price,
        reason: reason || "Manual price update",
        changedById: session.user.id
      }
    })

    // Update equipment price
    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        sellingPrice: price,
        lastUpdatedById: session.user.id
      }
    })

    // If synced to WooCommerce, update there too
    if (equipment.syncedToWoo && equipment.woocommerceId) {
      try {
        await syncEquipmentToWooCommerce(id)
      } catch (error) {
        console.error("WooCommerce sync failed:", error)
        // Don't fail the whole operation if WooCommerce sync fails
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED_PRICE",
        entityType: "EQUIPMENT",
        entityId: id,
        details: JSON.stringify({
          oldPrice: currentEquipment.sellingPrice,
          newPrice: price
        })
      }
    })

    return NextResponse.json(equipment)
  } catch (error) {
    console.error("PUT /api/equipment/[id]/price error:", error)
    return NextResponse.json({ error: "Failed to update price" }, { status: 500 })
  }
}
