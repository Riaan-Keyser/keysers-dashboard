import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncEquipmentToWooCommerce } from "@/lib/woocommerce"
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

    // Sync to WooCommerce
    const wooProduct = await syncEquipmentToWooCommerce(id)

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SYNCED_TO_WOOCOMMERCE",
        entityType: "EQUIPMENT",
        entityId: id,
        details: JSON.stringify({ wooProductId: wooProduct.id })
      }
    })

    return NextResponse.json({ success: true, wooProduct })
  } catch (error: any) {
    console.error("POST /api/equipment/[id]/sync error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync to WooCommerce" },
      { status: 500 }
    )
  }
}
