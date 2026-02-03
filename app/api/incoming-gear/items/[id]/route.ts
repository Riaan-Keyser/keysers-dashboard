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

    const updateData: any = {}
    
    if (body.proposedPrice !== undefined) updateData.proposedPrice = parseFloat(body.proposedPrice)
    if (body.finalPrice !== undefined) updateData.finalPrice = parseFloat(body.finalPrice)
    if (body.suggestedSellPrice !== undefined) updateData.suggestedSellPrice = parseFloat(body.suggestedSellPrice)
    if (body.status !== undefined) updateData.status = body.status
    if (body.reviewNotes !== undefined) updateData.reviewNotes = body.reviewNotes

    const updated = await prisma.pendingItem.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT /api/incoming-gear/items/[id] error:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}
