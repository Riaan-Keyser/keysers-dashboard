import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, OverrideReason } from "@prisma/client"

// POST /api/inspections/items/[itemId]/price-override - Create/update price override
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await params
    const body = await request.json()
    const { overrideBuyPrice, overrideConsignPrice, overrideReason, notes } = body

    // Validate that at least one price is being overridden
    if (overrideBuyPrice === undefined && overrideConsignPrice === undefined) {
      return NextResponse.json(
        { error: "At least one price must be overridden" },
        { status: 400 }
      )
    }

    // Validate override reason
    if (!overrideReason) {
      return NextResponse.json({ error: "Override reason is required" }, { status: 400 })
    }

    if (!Object.values(OverrideReason).includes(overrideReason)) {
      return NextResponse.json({ error: "Invalid override reason" }, { status: 400 })
    }

    // If reason is OTHER, notes are required
    if (overrideReason === "OTHER" && !notes) {
      return NextResponse.json(
        { error: "Notes are required when reason is OTHER" },
        { status: 400 }
      )
    }

    // Get incoming item
    const incomingItem = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: {
        verifiedItem: true
      }
    })

    if (!incomingItem || !incomingItem.verifiedItem) {
      return NextResponse.json({ error: "Verified item not found" }, { status: 404 })
    }

    const verifiedItemId = incomingItem.verifiedItem.id

    // Check if item is locked
    if (incomingItem.verifiedItem.locked && !hasPermission(session.user.role, UserRole.ADMIN)) {
      return NextResponse.json(
        { error: "Item is locked. Only admins can modify." },
        { status: 403 }
      )
    }

    // Create or update price override
    const priceOverride = await prisma.priceOverride.upsert({
      where: { verifiedItemId },
      update: {
        overrideBuyPrice: overrideBuyPrice ?? null,
        overrideConsignPrice: overrideConsignPrice ?? null,
        overrideReason,
        notes,
        overriddenAt: new Date(),
        overriddenById: session.user.id
      },
      create: {
        verifiedItemId,
        overrideBuyPrice: overrideBuyPrice ?? null,
        overrideConsignPrice: overrideConsignPrice ?? null,
        overrideReason,
        notes,
        overriddenById: session.user.id
      },
      include: {
        overriddenBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PRICE_OVERRIDE_APPLIED",
        entityType: "PRICE_OVERRIDE",
        entityId: priceOverride.id,
        details: JSON.stringify({
          verifiedItemId,
          overrideBuyPrice,
          overrideConsignPrice,
          overrideReason,
          notes
        })
      }
    })

    return NextResponse.json({ priceOverride }, { status: 200 })
  } catch (error: any) {
    console.error("POST /api/inspections/items/[itemId]/price-override error:", error)
    return NextResponse.json({ error: error.message || "Failed to apply price override" }, { status: 500 })
  }
}

// DELETE /api/inspections/items/[itemId]/price-override - Revert to auto pricing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await params

    // Get incoming item
    const incomingItem = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: {
        verifiedItem: true
      }
    })

    if (!incomingItem || !incomingItem.verifiedItem) {
      return NextResponse.json({ error: "Verified item not found" }, { status: 404 })
    }

    // Check if item is locked
    if (incomingItem.verifiedItem.locked && !hasPermission(session.user.role, UserRole.ADMIN)) {
      return NextResponse.json(
        { error: "Item is locked. Only admins can modify." },
        { status: 403 }
      )
    }

    // Delete price override
    await prisma.priceOverride.delete({
      where: { verifiedItemId: incomingItem.verifiedItem.id }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PRICE_OVERRIDE_REVERTED",
        entityType: "VERIFIED_GEAR_ITEM",
        entityId: incomingItem.verifiedItem.id,
        details: JSON.stringify({ revertedAt: new Date() })
      }
    })

    return NextResponse.json({ success: true, message: "Price override reverted" }, { status: 200 })
  } catch (error: any) {
    console.error("DELETE /api/inspections/items/[itemId]/price-override error:", error)
    return NextResponse.json({ error: error.message || "Failed to revert price override" }, { status: 500 })
  }
}
