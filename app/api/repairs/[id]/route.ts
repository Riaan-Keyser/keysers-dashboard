import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const body = await request.json()

    // Get the repair to find equipment ID
    const existingRepair = await prisma.repairLog.findUnique({
      where: { id },
      include: { equipment: true }
    })

    if (!existingRepair) {
      return NextResponse.json({ error: "Repair not found" }, { status: 404 })
    }

    // Update repair log
    const repair = await prisma.repairLog.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        actualCost: body.actualCost,
        completedAt: body.completedAt
      }
    })

    // Update equipment status based on repair status
    if (body.status === "COMPLETED" || body.status === "RETURNED") {
      await prisma.equipment.update({
        where: { id: existingRepair.equipmentId },
        data: {
          inRepair: false,
          status: "REPAIR_COMPLETED"
        }
      })
    } else if (body.status === "IN_PROGRESS") {
      await prisma.equipment.update({
        where: { id: existingRepair.equipmentId },
        data: {
          status: "IN_REPAIR"
        }
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED_REPAIR",
        entityType: "REPAIR",
        entityId: repair.id,
        details: JSON.stringify({
          equipmentName: existingRepair.equipment.name,
          newStatus: body.status
        })
      }
    })

    return NextResponse.json(repair)
  } catch (error) {
    console.error("PUT /api/repairs/[id] error:", error)
    return NextResponse.json({ error: "Failed to update repair" }, { status: 500 })
  }
}
