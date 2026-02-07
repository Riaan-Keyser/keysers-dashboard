import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const acquisitionType = searchParams.get("acquisitionType")
    const intakeStatus = searchParams.get("intakeStatus")

    const where: any = {}
    if (status) where.status = status
    if (acquisitionType) where.acquisitionType = acquisitionType
    if (intakeStatus) where.intakeStatus = intakeStatus

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Convert Decimal fields to numbers for proper JSON serialization
    const serializedEquipment = equipment.map(item => ({
      ...item,
      sellingPrice: parseFloat(item.sellingPrice.toString()),
      purchasePrice: item.purchasePrice ? parseFloat(item.purchasePrice.toString()) : null,
      costPrice: item.costPrice ? parseFloat(item.costPrice.toString()) : null,
      consignmentRate: item.consignmentRate ? parseFloat(item.consignmentRate.toString()) : null
    }))

    return NextResponse.json(serializedEquipment)
  } catch (error) {
    console.error("GET /api/equipment error:", error)
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Generate SKU if not provided
    if (!body.sku) {
      const count = await prisma.equipment.count()
      body.sku = `KEQ-${String(count + 1).padStart(6, '0')}`
    }

    const equipment = await prisma.equipment.create({
      data: {
        ...body,
        createdById: session.user.id
      },
      include: {
        vendor: true
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_EQUIPMENT",
        entityType: "EQUIPMENT",
        entityId: equipment.id,
        details: JSON.stringify({
          name: equipment.name,
          sku: equipment.sku
        })
      }
    })

    // Convert for response
    const response = {
      ...equipment,
      sellingPrice: parseFloat(equipment.sellingPrice.toString()),
      purchasePrice: equipment.purchasePrice ? parseFloat(equipment.purchasePrice.toString()) : null,
      costPrice: equipment.costPrice ? parseFloat(equipment.costPrice.toString()) : null,
      consignmentRate: equipment.consignmentRate ? parseFloat(equipment.consignmentRate.toString()) : null
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("POST /api/equipment error:", error)
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 })
  }
}
