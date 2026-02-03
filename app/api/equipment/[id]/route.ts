import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        priceHistory: {
          include: {
            changedBy: {
              select: { id: true, name: true }
            }
          },
          orderBy: { changedAt: "desc" }
        },
        repairHistory: {
          orderBy: { sentAt: "desc" }
        }
      }
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Convert Decimal fields to numbers
    const response = {
      ...equipment,
      sellingPrice: parseFloat(equipment.sellingPrice.toString()),
      purchasePrice: equipment.purchasePrice ? parseFloat(equipment.purchasePrice.toString()) : null,
      costPrice: equipment.costPrice ? parseFloat(equipment.costPrice.toString()) : null,
      consignmentRate: equipment.consignmentRate ? parseFloat(equipment.consignmentRate.toString()) : null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("GET /api/equipment/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 })
  }
}

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

    // Build update data with proper type conversion
    const updateData: any = {
      lastUpdatedById: session.user.id
    }

    // Handle string fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.brand !== undefined) updateData.brand = body.brand
    if (body.model !== undefined) updateData.model = body.model
    if (body.category !== undefined) updateData.category = body.category
    if (body.condition !== undefined) updateData.condition = body.condition
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber || null
    if (body.acquisitionType !== undefined) updateData.acquisitionType = body.acquisitionType
    if (body.status !== undefined) updateData.status = body.status
    if (body.location !== undefined) updateData.location = body.location || null

    // Handle vendor relationship
    if (body.vendorId !== undefined) {
      updateData.vendorId = body.vendorId || null
    }

    // Handle numeric/decimal fields with proper conversion
    if (body.sellingPrice !== undefined) {
      const price = parseFloat(body.sellingPrice)
      if (!isNaN(price)) updateData.sellingPrice = price
    }
    
    if (body.purchasePrice !== undefined) {
      if (body.purchasePrice === null || body.purchasePrice === "") {
        updateData.purchasePrice = null
      } else {
        const price = parseFloat(body.purchasePrice)
        if (!isNaN(price)) updateData.purchasePrice = price
      }
    }
    
    if (body.costPrice !== undefined) {
      if (body.costPrice === null || body.costPrice === "") {
        updateData.costPrice = null
      } else {
        const price = parseFloat(body.costPrice)
        if (!isNaN(price)) updateData.costPrice = price
      }
    }
    
    if (body.consignmentRate !== undefined) {
      if (body.consignmentRate === null || body.consignmentRate === "") {
        updateData.consignmentRate = null
      } else {
        const rate = parseFloat(body.consignmentRate)
        if (!isNaN(rate)) updateData.consignmentRate = rate
      }
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED_EQUIPMENT",
        entityType: "EQUIPMENT",
        entityId: equipment.id,
        details: JSON.stringify(body)
      }
    })

    // Return with converted decimals
    const response = {
      ...equipment,
      sellingPrice: parseFloat(equipment.sellingPrice.toString()),
      purchasePrice: equipment.purchasePrice ? parseFloat(equipment.purchasePrice.toString()) : null,
      costPrice: equipment.costPrice ? parseFloat(equipment.costPrice.toString()) : null,
      consignmentRate: equipment.consignmentRate ? parseFloat(equipment.consignmentRate.toString()) : null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("PUT /api/equipment/[id] error:", error)
    return NextResponse.json({ error: "Failed to update equipment" }, { status: 500 })
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

    await prisma.equipment.delete({
      where: { id }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETED_EQUIPMENT",
        entityType: "EQUIPMENT",
        entityId: id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/equipment/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete equipment" }, { status: 500 })
  }
}
