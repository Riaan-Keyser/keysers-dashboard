import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/inventory-db"

function isNonEmptyString(value: any): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function toNullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function isLensProductType(productType: any): boolean {
  return typeof productType === "string" && productType.toLowerCase().includes("lens")
}

function normalizeMount(mount: any): string | null {
  if (!isNonEmptyString(mount)) return null
  return mount.trim()
}

// GET /api/admin/catalog/items/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const id = params.id

  const res = await query(
    `
SELECT
  id,
  make,
  output_text,
  product_type,
  is_active,
  buy_low,
  buy_high,
  consign_low,
  consign_high,
  specifications,
  updated_at
FROM catalog_items
WHERE id = $1
LIMIT 1;
    `,
    [id]
  )

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Catalog item not found" }, { status: 404 })
  }

  return NextResponse.json({ item: res.rows[0] })
}

// PATCH /api/admin/catalog/items/:id
// Body: partial update (make/output_text/product_type/is_active/pricing/specifications fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const id = params.id
  const body = await request.json().catch(() => ({}))

  // Fetch current row (for safe merge of JSONB)
  const currentRes = await query(
    `SELECT id, make, output_text, product_type, is_active, buy_low, buy_high, consign_low, consign_high, specifications
     FROM catalog_items WHERE id = $1 LIMIT 1;`,
    [id]
  )
  if (currentRes.rows.length === 0) {
    return NextResponse.json({ error: "Catalog item not found" }, { status: 404 })
  }
  const current = currentRes.rows[0]
  const currentSpecs = current.specifications || {}

  const nextMake = body.make !== undefined ? (isNonEmptyString(body.make) ? body.make.trim() : "") : current.make
  const nextOutputText =
    body.output_text !== undefined ? (isNonEmptyString(body.output_text) ? body.output_text.trim() : "") : current.output_text
  const nextProductType =
    body.product_type !== undefined ? (isNonEmptyString(body.product_type) ? body.product_type.trim() : "") : current.product_type
  const nextIsActive = body.is_active !== undefined ? !!body.is_active : current.is_active

  const nextBuyLow = body.buy_low !== undefined ? toNullableNumber(body.buy_low) : current.buy_low
  const nextBuyHigh = body.buy_high !== undefined ? toNullableNumber(body.buy_high) : current.buy_high
  const nextConsignLow = body.consign_low !== undefined ? toNullableNumber(body.consign_low) : current.consign_low
  const nextConsignHigh = body.consign_high !== undefined ? toNullableNumber(body.consign_high) : current.consign_high

  // Merge specifications fields (only those provided)
  const specsPatch = body.specifications || {}
  const mergedSpecs: any = { ...currentSpecs }

  if (specsPatch.mount !== undefined) mergedSpecs.mount = normalizeMount(specsPatch.mount)
  if (specsPatch.focal_min_mm !== undefined) mergedSpecs.focal_min_mm = toNullableNumber(specsPatch.focal_min_mm)
  if (specsPatch.focal_max_mm !== undefined) mergedSpecs.focal_max_mm = toNullableNumber(specsPatch.focal_max_mm)
  if (specsPatch.aperture_min !== undefined) mergedSpecs.aperture_min = toNullableNumber(specsPatch.aperture_min)
  if (specsPatch.aperture_max !== undefined) mergedSpecs.aperture_max = toNullableNumber(specsPatch.aperture_max)

  // Clean null/empty keys (avoid storing empty strings)
  for (const key of ["mount"] as const) {
    if (mergedSpecs[key] === "") mergedSpecs[key] = null
  }

  // Block activation for incomplete lens specs
  if (nextIsActive && isLensProductType(nextProductType)) {
    const missing: string[] = []
    const mount = mergedSpecs.mount
    const focalMin = mergedSpecs.focal_min_mm
    const apertureMin = mergedSpecs.aperture_min

    if (!isNonEmptyString(mount)) missing.push("specifications.mount")
    if (focalMin === null || focalMin === undefined) missing.push("specifications.focal_min_mm")
    if (apertureMin === null || apertureMin === undefined) missing.push("specifications.aperture_min")

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot activate lens catalog item: missing required lens specs",
          missing,
        },
        { status: 400 }
      )
    }
  }

  // Required field enforcement for active items (Category A rule)
  if (nextIsActive) {
    const missing: string[] = []
    if (!isNonEmptyString(nextOutputText)) missing.push("output_text")
    if (!isNonEmptyString(nextMake)) missing.push("make")
    if (!isNonEmptyString(nextProductType)) missing.push("product_type")
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Cannot activate item: missing required fields", missing },
        { status: 400 }
      )
    }
  }

  // Pricing invalid protection (no negatives)
  const pricingFields: Array<[string, number | null]> = [
    ["buy_low", nextBuyLow],
    ["buy_high", nextBuyHigh],
    ["consign_low", nextConsignLow],
    ["consign_high", nextConsignHigh],
  ]
  const neg = pricingFields.filter(([, v]) => v !== null && v !== undefined && v < 0).map(([k]) => k)
  if (neg.length > 0) {
    return NextResponse.json({ error: "Pricing fields cannot be negative", fields: neg }, { status: 400 })
  }

  await query(
    `
UPDATE catalog_items
SET
  make = $2,
  output_text = $3,
  product_type = $4,
  is_active = $5,
  buy_low = $6,
  buy_high = $7,
  consign_low = $8,
  consign_high = $9,
  specifications = $10,
  updated_at = NOW()
WHERE id = $1;
    `,
    [
      id,
      nextMake,
      nextOutputText,
      nextProductType,
      nextIsActive,
      nextBuyLow,
      nextBuyHigh,
      nextConsignLow,
      nextConsignHigh,
      JSON.stringify(mergedSpecs),
    ]
  )

  return NextResponse.json({ success: true })
}

