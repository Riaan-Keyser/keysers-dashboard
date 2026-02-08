import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/webhooks/events/summary
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  try {
    // Count by status
    const byStatus = await prisma.webhookEventLog.groupBy({
      by: ["status"],
      _count: true
    })

    const statusCounts = Object.fromEntries(
      byStatus.map((item) => [item.status, item._count])
    )

    // Count FAILED events that are not ignored
    const failedNotIgnored = await prisma.webhookEventLog.count({
      where: {
        status: "FAILED",
        ignoredAt: null
      }
    })

    return NextResponse.json({
      by_status: statusCounts,
      failed_not_ignored_count: failedNotIgnored
    })
  } catch (error: any) {
    console.error("Failed to fetch webhook event summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch summary", details: error.message },
      { status: 500 }
    )
  }
}
