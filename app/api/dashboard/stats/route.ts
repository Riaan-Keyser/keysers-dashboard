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

    // Get total inventory count
    const totalInventory = await prisma.equipment.count()

    // Get pending inspection count
    const pendingInspection = await prisma.equipment.count({
      where: { status: "PENDING_INSPECTION" }
    })

    // Get in repair count
    const inRepair = await prisma.equipment.count({
      where: { inRepair: true }
    })

    // Get ready for sale count
    const readyForSale = await prisma.equipment.count({
      where: { status: "READY_FOR_SALE" }
    })

    // Calculate total value - convert Decimal to number properly
    const equipment = await prisma.equipment.findMany({
      select: { sellingPrice: true },
      where: {
        status: {
          in: ["READY_FOR_SALE", "RESERVED", "PENDING_INSPECTION", "INSPECTED"]
        }
      }
    })
    
    // Properly convert Decimal to number and sum
    const totalValue = equipment.reduce((sum, item) => {
      const price = parseFloat(item.sellingPrice.toString())
      return sum + (isNaN(price) ? 0 : price)
    }, 0)

    // Get active vendors (vendors with equipment)
    const activeVendors = await prisma.vendor.count({
      where: {
        equipment: {
          some: {}
        }
      }
    })

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    const formattedActivity = recentActivity.map(activity => ({
      action: `${activity.user.name} ${activity.action.toLowerCase().replace(/_/g, ' ')}`,
      time: new Date(activity.createdAt).toLocaleString()
    }))

    return NextResponse.json({
      totalInventory,
      pendingInspection,
      inRepair,
      readyForSale,
      totalValue,
      activeVendors,
      recentActivity: formattedActivity
    })
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
