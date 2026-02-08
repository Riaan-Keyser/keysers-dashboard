import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/inventory-db"

// GET /api/admin/catalog/issues?status=OPEN&type=...&page=1&pageSize=50
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const status = (sp.get("status") || "OPEN").toUpperCase()
  const type = sp.get("type")
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10))
  const pageSize = Math.min(200, Math.max(10, parseInt(sp.get("pageSize") || "50", 10)))
  const offset = (page - 1) * pageSize

  if (status !== "OPEN" && status !== "RESOLVED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const params: any[] = [status]
  let whereSql = `WHERE i.status = $1 AND i.severity = 'BLOCKING'`
  if (type) {
    params.push(type)
    whereSql += ` AND i.issue_type = $${params.length}`
  }

  const countRes = await query(
    `
SELECT COUNT(*)::int AS total
FROM catalog_blocking_issues i
${whereSql};
    `,
    params
  )
  const total = countRes.rows[0]?.total ?? 0

  params.push(pageSize, offset)
  const listRes = await query(
    `
SELECT
  i.id,
  i.catalog_item_id,
  i.issue_type,
  i.severity,
  i.status,
  i.message,
  i.details,
  i.first_detected_at,
  i.last_detected_at,
  i.resolved_at,
  i.resolved_by_user_id,
  i.resolution_note,
  ci.make,
  ci.output_text,
  ci.product_type,
  ci.is_active
FROM catalog_blocking_issues i
JOIN catalog_items ci ON ci.id = i.catalog_item_id
${whereSql}
ORDER BY i.last_detected_at DESC
LIMIT $${params.length - 1} OFFSET $${params.length};
    `,
    params
  )

  return NextResponse.json({
    page,
    pageSize,
    total,
    issues: listRes.rows,
  })
}

