import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withInventoryTx } from "@/lib/inventory-tx"

// POST /api/admin/enrichment-reviews/:id/reject
// Body: { note: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const id = params.id
  const body = await request.json().catch(() => ({}))
  const note = String(body?.note || "").trim()

  if (!note) {
    return NextResponse.json({ error: "note is required" }, { status: 400 })
  }

  try {
    const result = await withInventoryTx(async (client) => {
      const sRes = await client.query(
        `SELECT id, status FROM catalog_enrichment_suggestions WHERE id = $1 FOR UPDATE;`,
        [id]
      )
      if (sRes.rows.length === 0) {
        return { status: 404 as const, body: { error: "Review not found" } }
      }
      const suggestion = sRes.rows[0]
      if (suggestion.status !== "PENDING_REVIEW") {
        return {
          status: 409 as const,
          body: { error: `Cannot reject suggestion in status ${suggestion.status}` },
        }
      }

      await client.query(
        `
UPDATE catalog_enrichment_suggestions
SET
  status = 'REJECTED',
  reviewed_at = NOW(),
  reviewed_by_user_id = $2,
  review_note = $3,
  updated_at = NOW()
WHERE id = $1;
        `,
        [id, session.user.id, note]
      )

      return { status: 200 as const, body: { success: true } }
    })

    return NextResponse.json(result.body, { status: result.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to reject" }, { status: 500 })
  }
}

