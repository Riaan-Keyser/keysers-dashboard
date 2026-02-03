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

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        equipment: {
          orderBy: { createdAt: "desc" }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    // Convert equipment decimal fields to numbers
    const response = {
      ...vendor,
      equipment: vendor.equipment.map(eq => ({
        ...eq,
        sellingPrice: parseFloat(eq.sellingPrice.toString()),
        purchasePrice: eq.purchasePrice ? parseFloat(eq.purchasePrice.toString()) : null,
        costPrice: eq.costPrice ? parseFloat(eq.costPrice.toString()) : null,
        consignmentRate: eq.consignmentRate ? parseFloat(eq.consignmentRate.toString()) : null
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("GET /api/vendors/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 })
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

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        notes: body.notes || null,
        trustScore: body.trustScore
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED_VENDOR",
        entityType: "VENDOR",
        entityId: vendor.id,
        details: JSON.stringify({ name: vendor.name })
      }
    })

    return NextResponse.json(vendor)
  } catch (error) {
    console.error("PUT /api/vendors/[id] error:", error)
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 })
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

    // Get vendor name before deletion for logging
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { name: true }
    })

    await prisma.vendor.delete({
      where: { id }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETED_VENDOR",
        entityType: "VENDOR",
        entityId: id,
        details: JSON.stringify({ name: vendor?.name })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/vendors/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 })
  }
}
