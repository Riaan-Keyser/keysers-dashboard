import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/inventory-db"

// GET /api/admin/enrichment-reviews/summary
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const totals = await query(
    `
SELECT status, COUNT(*)::int AS count
FROM catalog_enrichment_suggestions
GROUP BY status
ORDER BY status;
    `
  )

  const by_status: Record<string, number> = {}
  let pending_review_count = 0
  for (const r of totals.rows) {
    by_status[r.status] = r.count
    if (r.status === "PENDING_REVIEW") pending_review_count = r.count
  }

  return NextResponse.json({
    pending_review_count,
    by_status,
  })
}

