import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/bundles/[id] - Dissolve bundle
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundle = await prisma.bundle.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Unlink all equipment from bundle
    await prisma.equipment.updateMany({
      where: { bundleId: bundle.id },
      data: { bundleId: null },
    })

    // Delete bundle items
    await prisma.bundleItem.deleteMany({
      where: { bundleId: bundle.id },
    })

    // Mark bundle as dissolved
    await prisma.bundle.update({
      where: { id: bundle.id },
      data: { status: "DISSOLVED" },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DISSOLVED_BUNDLE",
        entityType: "BUNDLE",
        entityId: bundle.id,
        details: JSON.stringify({
          title: bundle.title,
          itemCount: bundle.items.length,
        }),
      },
    })

    console.log(`✅ Bundle dissolved: ${bundle.title}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to dissolve bundle:", error)
    return NextResponse.json(
      { error: "Failed to dissolve bundle" },
      { status: 500 }
    )
  }
}

// POST /api/bundles/[id]/remove-item - Remove single item from bundle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { equipmentId } = body

    if (!equipmentId) {
      return NextResponse.json(
        { error: "Equipment ID required" },
        { status: 400 }
      )
    }

    const bundle = await prisma.bundle.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Remove item from bundle
    await prisma.bundleItem.delete({
      where: { equipmentId },
    })

    // Unlink equipment
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { bundleId: null },
    })

    // Check if bundle has only 1 item left - dissolve if so
    const remainingItems = bundle.items.filter(item => item.equipmentId !== equipmentId)
    if (remainingItems.length <= 1) {
      // Dissolve bundle
      if (remainingItems.length === 1) {
        await prisma.equipment.update({
          where: { id: remainingItems[0].equipmentId },
          data: { bundleId: null },
        })
        await prisma.bundleItem.delete({
          where: { equipmentId: remainingItems[0].equipmentId },
        })
      }

      await prisma.bundle.update({
        where: { id: bundle.id },
        data: { status: "DISSOLVED" },
      })

      console.log(`✅ Bundle dissolved after removing last items: ${bundle.title}`)
    } else {
      // Recalculate cost price
      const equipment = await prisma.equipment.findMany({
        where: { bundleId: bundle.id },
      })

      const newCostPrice = equipment.reduce((sum, item) => {
        return sum + (item.costPrice ? Number(item.costPrice) : 0)
      }, 0)

      await prisma.bundle.update({
        where: { id: bundle.id },
        data: { costPrice: newCostPrice },
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "REMOVED_ITEM_FROM_BUNDLE",
        entityType: "BUNDLE",
        entityId: bundle.id,
        details: JSON.stringify({
          bundleTitle: bundle.title,
          equipmentId,
          remainingItems: remainingItems.length,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to remove item from bundle:", error)
    return NextResponse.json(
      { error: "Failed to remove item from bundle" },
      { status: 500 }
    )
  }
}
