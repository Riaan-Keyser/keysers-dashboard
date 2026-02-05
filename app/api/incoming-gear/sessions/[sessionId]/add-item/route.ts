import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()

    // Verify the inspection session exists
    const inspectionSession = await prisma.inspectionSession.findUnique({
      where: { id: sessionId }
    })

    if (!inspectionSession) {
      return NextResponse.json({ error: "Inspection session not found" }, { status: 404 })
    }

    // Create a new IncomingGearItem
    const newItem = await prisma.incomingGearItem.create({
      data: {
        sessionId: sessionId,
        clientName: body.clientName || "New Product",
        clientBrand: body.clientBrand || null,
        clientModel: body.clientModel || null,
        clientDescription: body.clientDescription || null,
        clientSerialNumber: null,
        clientCondition: null,
        clientImages: [],
        inspectionStatus: "UNVERIFIED"
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_INCOMING_ITEM",
        entityType: "INCOMING_GEAR_ITEM",
        entityId: newItem.id,
        details: JSON.stringify({
          sessionId,
          itemName: newItem.clientName
        })
      }
    })

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error("POST /api/incoming-gear/sessions/[sessionId]/add-item error:", error)
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 })
  }
}
