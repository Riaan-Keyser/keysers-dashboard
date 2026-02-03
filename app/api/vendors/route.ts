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

    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: { equipment: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Transform data to include equipment count
    const vendorsWithCount = vendors.map(vendor => ({
      ...vendor,
      equipmentCount: vendor._count.equipment
    }))

    return NextResponse.json(vendorsWithCount)
  } catch (error) {
    console.error("GET /api/vendors error:", error)
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const vendor = await prisma.vendor.create({
      data: {
        ...body,
        createdById: session.user.id
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_VENDOR",
        entityType: "VENDOR",
        entityId: vendor.id,
        details: JSON.stringify({ name: vendor.name })
      }
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error("POST /api/vendors error:", error)
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 })
  }
}
