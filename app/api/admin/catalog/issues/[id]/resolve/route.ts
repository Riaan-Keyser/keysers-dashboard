import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/inventory-db"

// POST /api/admin/catalog/issues/:id/resolve
// Body: { resolution_note }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const { id } = params
  const body = await request.json().catch(() => ({}))
  const resolution_note = String(body?.resolution_note || "").trim()

  if (!resolution_note) {
    return NextResponse.json({ error: "resolution_note is required" }, { status: 400 })
  }

  const resolved_by_user_id = session.user.id

  const res = await query(
    `
UPDATE catalog_blocking_issues
SET
  status = 'RESOLVED',
  resolved_at = NOW(),
  resolved_by_user_id = $2,
  resolution_note = $3
WHERE id = $1
RETURNING id;
    `,
    [id, resolved_by_user_id, resolution_note]
  )

  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

