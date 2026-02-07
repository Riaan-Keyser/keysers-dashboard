import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET /api/bundles - List all bundles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundles = await prisma.bundle.findMany({
      where: { status: "ACTIVE" },
      include: {
        items: {
          include: {
            equipment: true,
          },
        },
        createdBy: {
          select: { name: true },
        },
        adminApprovedBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Serialize Decimal fields
    const serialized = bundles.map(bundle => ({
      ...bundle,
      sellingPrice: Number(bundle.sellingPrice),
      costPrice: Number(bundle.costPrice),
      items: bundle.items.map(item => ({
        ...item,
        equipment: {
          ...item.equipment,
          sellingPrice: Number(item.equipment.sellingPrice),
          purchasePrice: item.equipment.purchasePrice ? Number(item.equipment.purchasePrice) : null,
          costPrice: item.equipment.costPrice ? Number(item.equipment.costPrice) : null,
        },
      })),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error("Failed to fetch bundles:", error)
    return NextResponse.json(
      { error: "Failed to fetch bundles" },
      { status: 500 }
    )
  }
}

// POST /api/bundles - Create new bundle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, sellingPrice, equipmentIds, adminId, adminPassword } = body

    // Validation
    if (!title || !sellingPrice || !equipmentIds || equipmentIds.length < 2) {
      return NextResponse.json(
        { error: "Bundle requires title, selling price, and at least 2 items" },
        { status: 400 }
      )
    }

    // Admin approval required
    if (!adminId || !adminPassword) {
      return NextResponse.json(
        { error: "Admin approval required" },
        { status: 400 }
      )
    }

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Invalid admin" }, { status: 403 })
    }

    const passwordValid = await bcrypt.compare(adminPassword, admin.password)
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 403 })
    }

    // Fetch equipment items
    const equipment = await prisma.equipment.findMany({
      where: {
        id: { in: equipmentIds },
        intakeStatus: "INTAKE_COMPLETE",
        bundleId: null, // Not already in a bundle
      },
    })

    if (equipment.length !== equipmentIds.length) {
      return NextResponse.json(
        { error: "Some equipment items are not available for bundling" },
        { status: 400 }
      )
    }

    // Calculate cost price (sum of individual cost prices)
    const costPrice = equipment.reduce((sum, item) => {
      return sum + (item.costPrice ? Number(item.costPrice) : 0)
    }, 0)

    // Create bundle
    const bundle = await prisma.bundle.create({
      data: {
        title,
        description,
        sellingPrice,
        costPrice,
        status: "ACTIVE",
        createdById: session.user.id,
        adminApprovedById: admin.id,
        adminApprovedAt: new Date(),
      },
    })

    // Create bundle items and link equipment
    for (const equipmentId of equipmentIds) {
      await prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          equipmentId,
        },
      })

      // Link equipment to bundle
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
          bundleId: bundle.id,
        },
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_BUNDLE",
        entityType: "BUNDLE",
        entityId: bundle.id,
        details: JSON.stringify({
          title: bundle.title,
          itemCount: equipmentIds.length,
          sellingPrice: bundle.sellingPrice,
          approvedBy: admin.name,
        }),
      },
    })

    console.log(`✅ Bundle created: ${bundle.title} with ${equipmentIds.length} items`)

    return NextResponse.json({
      success: true,
      bundle: {
        ...bundle,
        sellingPrice: Number(bundle.sellingPrice),
        costPrice: Number(bundle.costPrice),
      },
    })
  } catch (error) {
    console.error("Failed to create bundle:", error)
    return NextResponse.json(
      { error: "Failed to create bundle" },
      { status: 500 }
    )
  }
}
