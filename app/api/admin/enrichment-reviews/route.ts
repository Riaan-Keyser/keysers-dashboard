import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/inventory-db"

// GET /api/admin/enrichment-reviews?status=PENDING_REVIEW&page=1&pageSize=50&q=...
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const status = (sp.get("status") || "PENDING_REVIEW").toUpperCase()
  const q = (sp.get("q") || "").trim()
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10))
  const pageSize = Math.min(200, Math.max(10, parseInt(sp.get("pageSize") || "50", 10)))
  const offset = (page - 1) * pageSize

  const allowed = new Set(["PENDING_REVIEW", "APPROVED", "REJECTED", "AUTO_APPLIED", "SUPERSEDED"])
  if (!allowed.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const params: any[] = [status]
  let whereSql = `WHERE s.status = $1`

  if (q) {
    params.push(`%${q.toLowerCase()}%`)
    whereSql += ` AND (LOWER(ci.make) LIKE $${params.length} OR LOWER(ci.output_text) LIKE $${params.length})`
  }

  const countRes = await query(
    `
SELECT COUNT(*)::int AS total
FROM catalog_enrichment_suggestions s
JOIN catalog_items ci ON ci.id = s.catalog_item_id
${whereSql};
    `,
    params
  )
  const total = countRes.rows[0]?.total ?? 0

  params.push(pageSize, offset)
  const listRes = await query(
    `
SELECT
  s.id,
  s.catalog_item_id,
  s.lensfun_lens_id,
  s.status,
  s.confidence_score,
  s.match_reasons,
  s.suggested_specs,
  s.specs_before,
  s.specs_after,
  s.created_at,
  s.updated_at,
  s.reviewed_at,
  s.reviewed_by_user_id,
  s.review_note,
  ci.make,
  ci.output_text,
  ci.product_type,
  ci.is_active,
  ci.specifications AS current_specs
FROM catalog_enrichment_suggestions s
JOIN catalog_items ci ON ci.id = s.catalog_item_id
${whereSql}
ORDER BY s.confidence_score DESC NULLS LAST, s.updated_at DESC
LIMIT $${params.length - 1} OFFSET $${params.length};
    `,
    params
  )

  return NextResponse.json({
    page,
    pageSize,
    total,
    reviews: listRes.rows,
  })
}

