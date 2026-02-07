import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPriceRecommendation } from "@/lib/price-recommendation"

// POST /api/ai/recommend-price - Get price recommendation for equipment
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

    // Fetch equipment
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        verifiedItem: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Get price recommendation
    const recommendation = await getPriceRecommendation(
      equipment.verifiedItem?.product?.id || null,
      equipment.brand,
      equipment.model,
      equipment.condition
    )

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "REQUESTED_PRICE_RECOMMENDATION",
        entityType: "EQUIPMENT",
        entityId: equipment.id,
        details: JSON.stringify({
          sku: equipment.sku,
          recommendedPrice: recommendation.recommendedPrice,
          sampleSize: recommendation.sampleSize,
          confidence: recommendation.confidence,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      recommendation,
    })
  } catch (error: any) {
    console.error("Failed to get price recommendation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get price recommendation" },
      { status: 500 }
    )
  }
}
