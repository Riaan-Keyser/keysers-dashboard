import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/notifications/counts - Get all notification badge counts in one request
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Execute all queries in parallel for performance
    const [
      pendingCalendarBookings,
      inspectionInProgress,
      flaggedCourierItems,
      awaitingPayment,
      pendingIntake,
      pendingInventoryApprovals,
      pendingConsignmentConfirmations,
      newlyConfirmedConsignments,
      itemsRequiringRepair,
    ] = await Promise.all([
      // Calendar: Pending delivery booking confirmations
      prisma.deliveryBooking.count({
        where: { status: "PENDING" },
      }),

      // Incoming Gear: Items in inspection
      prisma.pendingPurchase.count({
        where: {
          status: {
            in: ["INSPECTION_IN_PROGRESS", "AWAITING_DELIVERY"],
          },
        },
      }),

      // Incoming Gear: Flagged courier items (no tracking after 7 days)
      prisma.deliveryBooking.count({
        where: {
          deliveryMethod: "COURIER",
          flaggedForFollowUp: true,
        },
      }),

      // Awaiting Payment: Purchases with AWAITING_PAYMENT status
      prisma.pendingPurchase.count({
        where: { status: "AWAITING_PAYMENT" },
      }),

      // Uploading Stock: Items with PENDING_INTAKE
      prisma.equipment.count({
        where: { intakeStatus: "PENDING_INTAKE" },
      }),

      // Inventory: Pending admin approvals (simplified - could track actual pending approvals)
      // For now, we'll use 0 as this would require a separate approval tracking table
      Promise.resolve(0),

      // Consignment: Client confirmations pending
      prisma.consignmentChangeRequest.count({
        where: { status: "PENDING_CLIENT" },
      }),

      // Consignment: Newly confirmed changes (not yet processed)
      prisma.consignmentChangeRequest.count({
        where: {
          status: "CONFIRMED",
          clientConfirmedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),

      // Repairs: Items requiring repair
      prisma.equipment.count({
        where: {
          OR: [
            { inRepair: true },
            { status: "IN_REPAIR" },
          ],
        },
      }),
    ])

    const counts = {
      calendar: pendingCalendarBookings,
      incomingGear: inspectionInProgress + flaggedCourierItems,
      awaitingPayment,
      uploadingStock: pendingIntake,
      inventory: pendingInventoryApprovals,
      consignment: pendingConsignmentConfirmations + newlyConfirmedConsignments,
      repairs: itemsRequiringRepair,
    }

    return NextResponse.json(counts)
  } catch (error) {
    console.error("Failed to fetch notification counts:", error)
    return NextResponse.json(
      { error: "Failed to fetch notification counts" },
      { status: 500 }
    )
  }
}
