import { query } from "@/lib/inventory-db"

export type CatalogBlockingIssueType =
  | "LENS_MISSING_MOUNT"
  | "LENS_MISSING_FOCAL_AND_APERTURE"
  | "LENS_INVALID_FOCAL_RANGE"
  | "LENS_INVALID_APERTURE_RANGE"
  | "PRICING_NULL_OR_INVALID"
  | "REQUIRED_FIELD_VIOLATION_ON_ACTIVE"

export interface CatalogIssuesSummary {
  open_blocking_count: number
  by_type: Record<string, number>
}

export async function scanCatalogBlockingIssues(opts?: {
  autoResolveNote?: string
}): Promise<CatalogIssuesSummary> {
  const autoResolveNote = opts?.autoResolveNote ?? "Auto-resolved by rescan"

  // Build a set of CURRENT blocking issues (Category A v1)
  // and upsert OPEN issues idempotently. Then auto-resolve OPEN issues
  // that no longer apply.
  await query(
    `
WITH current_issues AS (
  -- 1) LENS_MISSING_MOUNT
  SELECT
    ci.id AS catalog_item_id,
    'LENS_MISSING_MOUNT'::text AS issue_type,
    'Lens is missing mount (specifications.mount and specifications.mounts are empty)'::text AS message,
    jsonb_build_object(
      'product_type', ci.product_type,
      'is_active', ci.is_active,
      'make', ci.make,
      'output_text', ci.output_text,
      'specifications', ci.specifications
    ) AS details
  FROM catalog_items ci
  WHERE ci.product_type ILIKE '%lens%'
    AND (
      NULLIF(BTRIM(ci.specifications->>'mount'), '') IS NULL
      AND (
        ci.specifications->'mounts' IS NULL
        OR jsonb_typeof(ci.specifications->'mounts') <> 'array'
        OR jsonb_array_length(ci.specifications->'mounts') = 0
      )
    )

  UNION ALL

  -- 2) LENS_MISSING_FOCAL_AND_APERTURE
  SELECT
    ci.id AS catalog_item_id,
    'LENS_MISSING_FOCAL_AND_APERTURE'::text AS issue_type,
    'Lens is missing both focal_min_mm and aperture_min'::text AS message,
    jsonb_build_object(
      'product_type', ci.product_type,
      'is_active', ci.is_active,
      'make', ci.make,
      'output_text', ci.output_text,
      'focal_min_mm', ci.specifications->>'focal_min_mm',
      'aperture_min', ci.specifications->>'aperture_min',
      'specifications', ci.specifications
    ) AS details
  FROM catalog_items ci
  WHERE ci.product_type ILIKE '%lens%'
    AND (ci.specifications->>'focal_min_mm' IS NULL)
    AND (ci.specifications->>'aperture_min' IS NULL)

  UNION ALL

  -- 3) LENS_INVALID_FOCAL_RANGE
  SELECT
    ci.id AS catalog_item_id,
    'LENS_INVALID_FOCAL_RANGE'::text AS issue_type,
    'Lens has invalid focal range (focal_min_mm > focal_max_mm)'::text AS message,
    jsonb_build_object(
      'product_type', ci.product_type,
      'is_active', ci.is_active,
      'make', ci.make,
      'output_text', ci.output_text,
      'focal_min_mm', ci.specifications->>'focal_min_mm',
      'focal_max_mm', ci.specifications->>'focal_max_mm',
      'specifications', ci.specifications
    ) AS details
  FROM catalog_items ci
  WHERE ci.product_type ILIKE '%lens%'
    AND (ci.specifications->>'focal_min_mm' IS NOT NULL)
    AND (ci.specifications->>'focal_max_mm' IS NOT NULL)
    AND (ci.specifications->>'focal_min_mm') ~ '^[0-9]+(\\.[0-9]+)?$'
    AND (ci.specifications->>'focal_max_mm') ~ '^[0-9]+(\\.[0-9]+)?$'
    AND ((ci.specifications->>'focal_min_mm')::numeric > (ci.specifications->>'focal_max_mm')::numeric)

  UNION ALL

  -- 4) LENS_INVALID_APERTURE_RANGE
  SELECT
    ci.id AS catalog_item_id,
    'LENS_INVALID_APERTURE_RANGE'::text AS issue_type,
    'Lens has invalid aperture range (aperture_min > aperture_max)'::text AS message,
    jsonb_build_object(
      'product_type', ci.product_type,
      'is_active', ci.is_active,
      'make', ci.make,
      'output_text', ci.output_text,
      'aperture_min', ci.specifications->>'aperture_min',
      'aperture_max', ci.specifications->>'aperture_max',
      'specifications', ci.specifications
    ) AS details
  FROM catalog_items ci
  WHERE ci.product_type ILIKE '%lens%'
    AND (ci.specifications->>'aperture_min' IS NOT NULL)
    AND (ci.specifications->>'aperture_max' IS NOT NULL)
    AND (ci.specifications->>'aperture_min') ~ '^[0-9]+(\\.[0-9]+)?$'
    AND (ci.specifications->>'aperture_max') ~ '^[0-9]+(\\.[0-9]+)?$'
    AND ((ci.specifications->>'aperture_min')::numeric > (ci.specifications->>'aperture_max')::numeric)

  UNION ALL

  -- 5) PRICING_NULL_OR_INVALID (any required pricing field is NULL or < 0)
  SELECT
    ci.id AS catalog_item_id,
    'PRICING_NULL_OR_INVALID'::text AS issue_type,
    'One or more pricing fields are NULL or negative'::text AS message,
    jsonb_build_object(
      'buy_low', ci.buy_low,
      'buy_high', ci.buy_high,
      'consign_low', ci.consign_low,
      'consign_high', ci.consign_high,
      'make', ci.make,
      'output_text', ci.output_text,
      'product_type', ci.product_type,
      'is_active', ci.is_active
    ) AS details
  FROM catalog_items ci
  WHERE
    ci.buy_low IS NULL OR ci.buy_low < 0
    OR ci.buy_high IS NULL OR ci.buy_high < 0
    OR ci.consign_low IS NULL OR ci.consign_low < 0
    OR ci.consign_high IS NULL OR ci.consign_high < 0

  UNION ALL

  -- 6) REQUIRED_FIELD_VIOLATION_ON_ACTIVE
  SELECT
    ci.id AS catalog_item_id,
    'REQUIRED_FIELD_VIOLATION_ON_ACTIVE'::text AS issue_type,
    'Active item is missing a required field (output_text/make/product_type)'::text AS message,
    jsonb_build_object(
      'make', ci.make,
      'output_text', ci.output_text,
      'product_type', ci.product_type,
      'is_active', ci.is_active
    ) AS details
  FROM catalog_items ci
  WHERE ci.is_active = true
    AND (
      NULLIF(BTRIM(ci.output_text), '') IS NULL
      OR NULLIF(BTRIM(ci.make), '') IS NULL
      OR NULLIF(BTRIM(ci.product_type), '') IS NULL
    )
),
upserted AS (
  INSERT INTO catalog_blocking_issues (
    catalog_item_id,
    issue_type,
    severity,
    status,
    message,
    details,
    first_detected_at,
    last_detected_at
  )
  SELECT
    c.catalog_item_id,
    c.issue_type,
    'BLOCKING'::text AS severity,
    'OPEN'::text AS status,
    c.message,
    c.details,
    NOW(),
    NOW()
  FROM current_issues c
  ON CONFLICT (catalog_item_id, issue_type) WHERE status = 'OPEN'
  DO UPDATE SET
    last_detected_at = NOW(),
    message = EXCLUDED.message,
    details = EXCLUDED.details
  RETURNING 1
),
auto_resolved AS (
  UPDATE catalog_blocking_issues i
  SET
    status = 'RESOLVED',
    resolved_at = NOW(),
    resolution_note = $1
  WHERE i.status = 'OPEN'
    AND i.severity = 'BLOCKING'
    AND NOT EXISTS (
      SELECT 1
      FROM current_issues c
      WHERE c.catalog_item_id = i.catalog_item_id
        AND c.issue_type = i.issue_type
    )
  RETURNING 1
)
SELECT 1;
    `,
    [autoResolveNote]
  )

  return await getCatalogIssuesSummary()
}

export async function getCatalogIssuesSummary(): Promise<CatalogIssuesSummary> {
  const rows = await query(
    `
SELECT
  COUNT(*)::int AS open_blocking_count
FROM catalog_blocking_issues
WHERE status = 'OPEN' AND severity = 'BLOCKING';
    `
  )

  const open_blocking_count = rows.rows[0]?.open_blocking_count ?? 0

  const byType = await query(
    `
SELECT issue_type, COUNT(*)::int AS count
FROM catalog_blocking_issues
WHERE status = 'OPEN' AND severity = 'BLOCKING'
GROUP BY issue_type
ORDER BY issue_type;
    `
  )

  const by_type: Record<string, number> = {}
  for (const r of byType.rows) {
    by_type[r.issue_type] = r.count
  }

  return { open_blocking_count, by_type }
}

