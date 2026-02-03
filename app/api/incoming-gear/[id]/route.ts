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

    const updated = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        status: body.status,
        reviewedById: body.action === "review" ? session.user.id : undefined,
        reviewedAt: body.action === "review" ? new Date() : undefined,
        approvedById: body.action === "approve" ? session.user.id : undefined,
        approvedAt: body.action === "approve" ? new Date() : undefined,
        rejectedReason: body.rejectedReason || undefined,
        notes: body.notes || undefined
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT /api/incoming-gear/[id] error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Delete the pending purchase (cascade will delete all items)
    await prisma.pendingPurchase.delete({
      where: { id }
    })

    // Log the deletion
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETED_PENDING_PURCHASE",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          deletedBy: session.user.name,
          deletedAt: new Date().toISOString()
        })
      }
    })

    return NextResponse.json({ success: true, message: "Purchase deleted successfully" })
  } catch (error) {
    console.error("DELETE /api/incoming-gear/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 })
  }
}
