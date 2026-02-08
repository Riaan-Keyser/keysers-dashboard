import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withInventoryTx } from "@/lib/inventory-tx"

function isLens(productType: any): boolean {
  return typeof productType === "string" && productType.toLowerCase().includes("lens")
}

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0
}

const LENS_SPEC_KEYS = ["mount", "mounts", "focal_min_mm", "focal_max_mm", "aperture_min", "aperture_max"] as const

function pickSuggestedLensSpecs(suggested: any): Record<string, any> {
  // Our suggested_specs may be the Lensfun audit block; normalize to lens spec fields.
  const out: Record<string, any> = {}

  // Prefer explicit lens spec fields if present.
  for (const k of LENS_SPEC_KEYS) {
    if (suggested && suggested[k] !== undefined && suggested[k] !== null && suggested[k] !== "") {
      out[k] = suggested[k]
    }
  }

  // If only mounts is present, set mount from mounts[0]
  if (!out.mount && Array.isArray(out.mounts) && out.mounts.length > 0) {
    out.mount = out.mounts[0]
  }

  return out
}

function applySpecsNonDestructive(currentSpecs: any, suggestedLensSpecs: Record<string, any>): any {
  const next = { ...(currentSpecs || {}) }
  for (const k of LENS_SPEC_KEYS) {
    if (!(k in suggestedLensSpecs)) continue
    const cur = next[k as any]
    if (cur === null || cur === undefined || cur === "") {
      next[k as any] = suggestedLensSpecs[k]
    }
  }
  return next
}

function applySpecsOverwriteLensKeys(currentSpecs: any, suggestedLensSpecs: Record<string, any>): any {
  const next = { ...(currentSpecs || {}) }
  for (const k of LENS_SPEC_KEYS) {
    if (!(k in suggestedLensSpecs)) continue
    next[k as any] = suggestedLensSpecs[k]
  }
  return next
}

// POST /api/admin/enrichment-reviews/:id/approve
// Body: { overwrite: boolean, note: string }
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
  const overwrite = !!body?.overwrite
  const note = String(body?.note || "").trim()

  if (!note) {
    return NextResponse.json({ error: "note is required" }, { status: 400 })
  }

  try {
    const result = await withInventoryTx(async (client) => {
      // Lock the suggestion row
      const sRes = await client.query(
        `
SELECT *
FROM catalog_enrichment_suggestions
WHERE id = $1
FOR UPDATE;
        `,
        [id]
      )

      if (sRes.rows.length === 0) {
        return { status: 404 as const, body: { error: "Review not found" } }
      }

      const suggestion = sRes.rows[0]
      if (suggestion.status !== "PENDING_REVIEW") {
        return {
          status: 409 as const,
          body: { error: `Cannot approve suggestion in status ${suggestion.status}` },
        }
      }

      // Load catalog item and lock it too
      const ciRes = await client.query(
        `
SELECT id, product_type, specifications
FROM catalog_items
WHERE id = $1
FOR UPDATE;
        `,
        [suggestion.catalog_item_id]
      )
      if (ciRes.rows.length === 0) {
        return { status: 404 as const, body: { error: "Catalog item not found" } }
      }

      const item = ciRes.rows[0]
      if (!isLens(item.product_type)) {
        return { status: 400 as const, body: { error: "Refusing to apply enrichment to non-lens product" } }
      }

      const currentSpecs = item.specifications || {}
      const suggestedSpecs = suggestion.suggested_specs || {}
      const suggestedLensSpecs = pickSuggestedLensSpecs(suggestedSpecs)

      if (Object.keys(suggestedLensSpecs).length === 0) {
        return { status: 400 as const, body: { error: "Suggested specs contain no lens spec fields" } }
      }

      const nextSpecs = overwrite
        ? applySpecsOverwriteLensKeys(currentSpecs, suggestedLensSpecs)
        : applySpecsNonDestructive(currentSpecs, suggestedLensSpecs)

      // Update catalog item specs
      await client.query(
        `
UPDATE catalog_items
SET specifications = $2, updated_at = NOW()
WHERE id = $1;
        `,
        [suggestion.catalog_item_id, JSON.stringify(nextSpecs)]
      )

      // Update suggestion
      const reviewNote = overwrite ? `${note}\n\n[overwrite=true] Overwrote lens spec keys: ${Object.keys(suggestedLensSpecs).join(", ")}` : note

      await client.query(
        `
UPDATE catalog_enrichment_suggestions
SET
  status = 'APPROVED',
  reviewed_at = NOW(),
  reviewed_by_user_id = $2,
  review_note = $3,
  specs_after = $4,
  updated_at = NOW()
WHERE id = $1;
        `,
        [id, session.user.id, reviewNote, JSON.stringify(nextSpecs)]
      )

      return { status: 200 as const, body: { success: true } }
    })

    return NextResponse.json(result.body, { status: result.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to approve" }, { status: 500 })
  }
}

