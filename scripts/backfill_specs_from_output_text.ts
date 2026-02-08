#!/usr/bin/env tsx
/**
 * Output Text Spec Parser Backfill (Category A helper)
 *
 * Targets catalog_items (keysers_inventory) where:
 * - product_type ILIKE '%lens%'
 * - specifications.focal_min_mm IS NULL AND specifications.aperture_min IS NULL
 *
 * Parses output_text for focal + aperture using strict regex.
 * Only fills NULL fields. Never overwrites.
 *
 * Usage:
 *   npx tsx scripts/backfill_specs_from_output_text.ts --dry-run
 *   npx tsx scripts/backfill_specs_from_output_text.ts --apply
 */

import "dotenv/config"
import { query } from "@/lib/inventory-db"

type Status = "APPLIED" | "SKIPPED" | "AMBIGUOUS" | "NO_MATCH"

type ParsedFocal = { min: number; max: number; pattern: string }
type ParsedAperture = { min: number; max: number; pattern: string; type: "F" | "T" }

function normText(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9
}

function parseFocal(text: string): { focal?: ParsedFocal; status?: Status; reason?: string } {
  const t = normText(text)

  // Prefer zoom ranges like "70-200mm" or "7.1-28.8mm"
  const zoomMatches = Array.from(
    t.matchAll(/\b(\d{1,4}(?:\.\d+)?)\s*-\s*(\d{1,4}(?:\.\d+)?)\s*mm\b/gi)
  ).map((m) => ({ a: Number(m[1]), b: Number(m[2]), raw: m[0] }))

  if (zoomMatches.length > 0) {
    const ranges = zoomMatches
      .map((z) => ({ min: Math.min(z.a, z.b), max: Math.max(z.a, z.b), pattern: z.raw.replace(/\s+/g, "") }))
      .filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max))

    if (ranges.length === 0) return {}
    const uniqRanges = uniq(ranges.map((r) => `${r.min}-${r.max}`))
    if (uniqRanges.length > 1) {
      return { status: "AMBIGUOUS", reason: `Multiple zoom ranges found: ${uniqRanges.join(", ")}` }
    }
    const [minStr, maxStr] = uniqRanges[0].split("-")
    const min = Number(minStr)
    const max = Number(maxStr)
    return { focal: { min, max, pattern: `${min}-${max}mm` } }
  }

  // Prime like "50mm" (avoid capturing the numbers from non-mm contexts)
  const primeMatches = Array.from(t.matchAll(/\b(\d{1,4}(?:\.\d+)?)\s*mm\b/gi)).map((m) => ({
    v: Number(m[1]),
    raw: m[0],
  }))
  const primes = primeMatches.filter((p) => Number.isFinite(p.v)).map((p) => p.v)
  const uniqPrimes = uniq(primes.map((n) => String(n)))
  if (uniqPrimes.length === 0) return {}
  if (uniqPrimes.length > 1) {
    return { status: "AMBIGUOUS", reason: `Multiple prime focal values found: ${uniqPrimes.join(", ")}` }
  }
  const v = Number(uniqPrimes[0])
  return { focal: { min: v, max: v, pattern: `${v}mm` } }
}

function parseAperture(text: string): { aperture?: ParsedAperture; status?: Status; reason?: string } {
  const t = normText(text)

  // Cine T-stop: "T2.9" or "T 2.9"
  const tStops = Array.from(t.matchAll(/\bT\s*(\d+(?:\.\d+)?)\b/g)).map((m) => ({
    min: Number(m[1]),
    max: Number(m[1]),
    raw: m[0].replace(/\s+/g, ""),
    type: "T" as const,
  }))

  // Variable aperture: "f4.5-5.6" or "f/4.5-5.6"
  const fRanges = Array.from(
    t.matchAll(/\bf\s*\/?\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(?=[a-zA-Z\s)]|$)/gi)
  ).map((m) => ({
    min: Math.min(Number(m[1]), Number(m[2])),
    max: Math.max(Number(m[1]), Number(m[2])),
    raw: `f${m[1]}-${m[2]}`.replace(/\s+/g, ""),
    type: "F" as const,
  }))

  // Constant aperture: "f2.8", "f/4", "f4L"
  const fSingles = Array.from(
    t.matchAll(/\bf\s*\/?\s*(\d+(?:\.\d+)?)(?=[a-zA-Z\s)]|$)/gi)
  ).map((m) => ({
    min: Number(m[1]),
    max: Number(m[1]),
    raw: `f${m[1]}`,
    type: "F" as const,
  }))

  const all = [...tStops, ...fRanges, ...fSingles].filter((a) => Number.isFinite(a.min) && Number.isFinite(a.max))
  if (all.length === 0) return {}

  // If both F and T present with different values, treat as ambiguous.
  const types = uniq(all.map((a) => a.type))
  if (types.length > 1) {
    const sig = uniq(all.map((a) => `${a.type}:${a.min}-${a.max}`))
    return { status: "AMBIGUOUS", reason: `Conflicting aperture types/values: ${sig.join(", ")}` }
  }

  // Prefer variable range if present.
  const ranges = all.filter((a) => !nearlyEqual(a.min, a.max))
  if (ranges.length > 0) {
    const uniqRanges = uniq(ranges.map((a) => `${a.min}-${a.max}`))
    if (uniqRanges.length > 1) {
      return { status: "AMBIGUOUS", reason: `Multiple aperture ranges found: ${uniqRanges.join(", ")}` }
    }
    const [minStr, maxStr] = uniqRanges[0].split("-")
    return {
      aperture: {
        min: Number(minStr),
        max: Number(maxStr),
        pattern: `f${minStr}-${maxStr}`,
        type: "F",
      },
    }
  }

  // Otherwise constant aperture.
  const singles = all.filter((a) => nearlyEqual(a.min, a.max))
  const uniqSingles = uniq(singles.map((a) => String(a.min)))
  if (uniqSingles.length > 1) {
    return { status: "AMBIGUOUS", reason: `Multiple aperture values found: ${uniqSingles.join(", ")}` }
  }
  const v = Number(uniqSingles[0])
  const type = types[0] as "F" | "T"
  return {
    aperture: {
      min: v,
      max: v,
      pattern: `${type}${v}`,
      type,
    },
  }
}

function mergeSpecsNonDestructive(current: any, focal?: ParsedFocal, aperture?: ParsedAperture): { next: any; changed: boolean } {
  const next = { ...(current || {}) }
  let changed = false

  // Only fill NULL/undefined fields
  if (focal) {
    if (next.focal_min_mm === null || next.focal_min_mm === undefined) {
      next.focal_min_mm = focal.min
      changed = true
    }
    if (next.focal_max_mm === null || next.focal_max_mm === undefined) {
      next.focal_max_mm = focal.max
      changed = true
    }
  }

  if (aperture) {
    if (next.aperture_min === null || next.aperture_min === undefined) {
      next.aperture_min = aperture.min
      changed = true
    }
    if (next.aperture_max === null || next.aperture_max === undefined) {
      next.aperture_max = aperture.max
      changed = true
    }
  }

  return { next, changed }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const apply = args.includes("--apply")

  if (!dryRun && !apply) {
    console.error("Provide --dry-run or --apply")
    process.exit(1)
  }
  if (dryRun && apply) {
    console.error("Choose only one: --dry-run or --apply")
    process.exit(1)
  }

  console.log("🔎 Output Text Spec Parser Backfill")
  console.log(`Mode: ${dryRun ? "DRY RUN" : "APPLY"}\n`)

  const target = await query(
    `
SELECT id, make, output_text, product_type, is_active, specifications
FROM catalog_items
WHERE product_type ILIKE '%lens%'
  AND (specifications->>'focal_min_mm' IS NULL)
  AND (specifications->>'aperture_min' IS NULL)
ORDER BY make, output_text;
    `
  )

  const stats: Record<Status, number> = {
    APPLIED: 0,
    SKIPPED: 0,
    AMBIGUOUS: 0,
    NO_MATCH: 0,
  }

  const examples: Record<Status, any[]> = {
    APPLIED: [],
    SKIPPED: [],
    AMBIGUOUS: [],
    NO_MATCH: [],
  }

  for (const row of target.rows) {
    const specsBefore = row.specifications || {}
    const text = String(row.output_text || "")

    const f = parseFocal(text)
    const a = parseAperture(text)

    // Determine combined outcome
    const ambiguousReasons: string[] = []
    if (f.status === "AMBIGUOUS") ambiguousReasons.push(`focal: ${f.reason}`)
    if (a.status === "AMBIGUOUS") ambiguousReasons.push(`aperture: ${a.reason}`)

    if (ambiguousReasons.length > 0) {
      stats.AMBIGUOUS++
      if (examples.AMBIGUOUS.length < 20) {
        examples.AMBIGUOUS.push({ id: row.id, make: row.make, output_text: row.output_text, reasons: ambiguousReasons })
      }
      if (apply) {
        await query(
          `
INSERT INTO catalog_text_parse_audit (
  catalog_item_id, parsed_from_text, parsed_focal, parsed_aperture,
  specs_before, specs_after, status
) VALUES ($1,$2,$3,$4,$5,$6,$7);
          `,
          [
            row.id,
            text,
            f.focal ? JSON.stringify(f.focal) : null,
            a.aperture ? JSON.stringify(a.aperture) : null,
            JSON.stringify(specsBefore),
            JSON.stringify(specsBefore),
            "AMBIGUOUS",
          ]
        )
      }
      continue
    }

    const focal = f.focal
    const aperture = a.aperture
    if (!focal && !aperture) {
      stats.NO_MATCH++
      if (examples.NO_MATCH.length < 20) {
        examples.NO_MATCH.push({ id: row.id, make: row.make, output_text: row.output_text })
      }
      if (apply) {
        await query(
          `
INSERT INTO catalog_text_parse_audit (
  catalog_item_id, parsed_from_text, parsed_focal, parsed_aperture,
  specs_before, specs_after, status
) VALUES ($1,$2,$3,$4,$5,$6,$7);
          `,
          [row.id, text, null, null, JSON.stringify(specsBefore), JSON.stringify(specsBefore), "NO_MATCH"]
        )
      }
      continue
    }

    const { next, changed } = mergeSpecsNonDestructive(specsBefore, focal, aperture)

    if (!changed) {
      stats.SKIPPED++
      if (examples.SKIPPED.length < 20) {
        examples.SKIPPED.push({ id: row.id, make: row.make, output_text: row.output_text })
      }
      if (apply) {
        await query(
          `
INSERT INTO catalog_text_parse_audit (
  catalog_item_id, parsed_from_text, parsed_focal, parsed_aperture,
  specs_before, specs_after, status
) VALUES ($1,$2,$3,$4,$5,$6,$7);
          `,
          [
            row.id,
            text,
            focal ? JSON.stringify(focal) : null,
            aperture ? JSON.stringify(aperture) : null,
            JSON.stringify(specsBefore),
            JSON.stringify(specsBefore),
            "SKIPPED",
          ]
        )
      }
      continue
    }

    stats.APPLIED++
    if (examples.APPLIED.length < 20) {
      examples.APPLIED.push({
        id: row.id,
        make: row.make,
        output_text: row.output_text,
        focal,
        aperture,
      })
    }

    if (apply) {
      await query(
        `
UPDATE catalog_items
SET specifications = $2, updated_at = NOW()
WHERE id = $1;
        `,
        [row.id, JSON.stringify(next)]
      )

      await query(
        `
INSERT INTO catalog_text_parse_audit (
  catalog_item_id, parsed_from_text, parsed_focal, parsed_aperture,
  specs_before, specs_after, status
) VALUES ($1,$2,$3,$4,$5,$6,$7);
        `,
        [
          row.id,
          text,
          focal ? JSON.stringify(focal) : null,
          aperture ? JSON.stringify(aperture) : null,
          JSON.stringify(specsBefore),
          JSON.stringify(next),
          "APPLIED",
        ]
      )
    }
  }

  console.log("=== SUMMARY ===")
  console.log(`Target rows: ${target.rows.length}`)
  console.log(`APPLIED: ${stats.APPLIED}`)
  console.log(`SKIPPED: ${stats.SKIPPED}`)
  console.log(`AMBIGUOUS: ${stats.AMBIGUOUS}`)
  console.log(`NO_MATCH: ${stats.NO_MATCH}`)

  const printExamples = (status: Status) => {
    console.log(`\n=== TOP 20 ${status} EXAMPLES ===`)
    for (const ex of examples[status]) {
      console.log(JSON.stringify(ex))
    }
  }

  printExamples("APPLIED")
  printExamples("AMBIGUOUS")
  printExamples("NO_MATCH")

  if (dryRun) {
    console.log("\n⚠️ DRY RUN: no DB updates and no audit rows were written.")
    console.log("Run with --apply to write updates + catalog_text_parse_audit rows.")
    console.log("After --apply, run Category A rescan: POST /api/admin/catalog/issues/rescan")
  } else {
    console.log("\n✅ APPLY complete.")
    console.log("Next: POST /api/admin/catalog/issues/rescan")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

