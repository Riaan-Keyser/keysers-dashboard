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
