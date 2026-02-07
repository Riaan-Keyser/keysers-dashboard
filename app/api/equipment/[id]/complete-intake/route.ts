import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// POST /api/equipment/[id]/complete-intake - Complete intake and move to inventory
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { adminId, adminPassword } = body

    // Validate admin credentials
    if (!adminId || !adminPassword) {
      return NextResponse.json(
        { error: "Admin approval required" },
        { status: 400 }
      )
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    })

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Invalid admin" },
        { status: 403 }
      )
    }

    const passwordValid = await bcrypt.compare(adminPassword, admin.password)
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 403 }
      )
    }

    // Get equipment
    const equipment = await prisma.equipment.findUnique({
      where: { id: params.id },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Validation
    if (!equipment.sku) {
      return NextResponse.json({ error: "SKU is required" }, { status: 400 })
    }
    if (!equipment.shelfLocation) {
      return NextResponse.json({ error: "Shelf location is required" }, { status: 400 })
    }
    if (!equipment.sellingPrice || equipment.sellingPrice === 0) {
      return NextResponse.json({ error: "Selling price is required" }, { status: 400 })
    }

    // Update equipment to complete intake
    const updated = await prisma.equipment.update({
      where: { id: params.id },
      data: {
        intakeStatus: "INTAKE_COMPLETE",
        status: "READY_FOR_SALE",
        lastUpdatedById: session.user.id,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "COMPLETED_INTAKE",
        entityType: "EQUIPMENT",
        entityId: equipment.id,
        details: JSON.stringify({
          sku: equipment.sku,
          shelfLocation: equipment.shelfLocation,
          sellingPrice: equipment.sellingPrice,
          approvedByAdmin: admin.name,
        }),
      },
    })

    console.log(`✅ Intake completed for ${equipment.sku} by ${session.user.name}, approved by ${admin.name}`)

    return NextResponse.json({
      success: true,
      equipment: updated,
    })
  } catch (error) {
    console.error("Failed to complete intake:", error)
    return NextResponse.json(
      { error: "Failed to complete intake" },
      { status: 500 }
    )
  }
}
