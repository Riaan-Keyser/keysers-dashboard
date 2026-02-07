import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateProductDescription } from "@/lib/ai-description"

// POST /api/ai/generate-description - Generate AI description for equipment
export async function POST(request: NextRequest) {
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

    // Fetch equipment with source verified item data
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        verifiedItem: {
          include: {
            product: true,
            accessories: true,
          },
        },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Prepare product info
    const productInfo = {
      brand: equipment.brand,
      model: equipment.model,
      name: equipment.name,
      condition: equipment.condition,
      category: equipment.category,
      serialNumber: equipment.serialNumber,
      generalNotes: equipment.verifiedItem?.generalNotes,
      accessories: equipment.verifiedItem?.accessories.map((acc: any) => ({
        name: acc.accessoryName,
        present: acc.isPresent,
      })),
    }

    // Generate description using AI
    const description = await generateProductDescription(productInfo)

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "GENERATED_AI_DESCRIPTION",
        entityType: "EQUIPMENT",
        entityId: equipment.id,
        details: JSON.stringify({
          sku: equipment.sku,
          model: equipment.model,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      description,
    })
  } catch (error: any) {
    console.error("Failed to generate description:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate description" },
      { status: 500 }
    )
  }
}
