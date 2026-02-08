import { compareTwoStrings } from 'string-similarity'

/**
 * CANONICAL LENSFUN MATCHING FUNCTION
 * 
 * This is the SINGLE source of truth for scoring how well a catalog item
 * matches a Lensfun lens entry. All enrichment logic MUST use this function.
 * 
 * Scoring weights:
 * - Maker match: 0.25 (25%)
 * - Model similarity: 0.50 (50%)
 * - Mount compatibility: 0.15 (15%)
 * - Spec consistency: 0.10 (10%)
 */

// Known maker aliases (case-insensitive matching)
const MAKER_ALIASES: Record<string, string[]> = {
  'canon': ['canon inc'],
  'nikon': ['nikon corporation'],
  'sony': ['sony corporation'],
  'fujifilm': ['fuji', 'fuji photo film'],
  'panasonic': ['lumix'],
  'leica': ['leica camera ag'],
  'olympus': ['olympus corporation', 'om system'],
  'pentax': ['pentax corporation', 'ricoh'],
  'sigma': ['sigma corporation'],
  'tamron': ['tamron co'],
  'tokina': ['kenko tokina'],
}

export interface CatalogItem {
  make: string
  output_text: string
  product_type: string
  specifications?: {
    mount?: string
    mounts?: string[]
    focal_min_mm?: number
    focal_max_mm?: number
    aperture_min?: number
    aperture_max?: number
    [key: string]: any
  }
}

export interface LensfunLens {
  id: string
  maker: string
  model: string
  mounts: string[]
  focalMin?: number | null
  focalMax?: number | null
  apertureMin?: number | null
  apertureMax?: number | null
  rawXml?: string | null
}

export interface MatchResult {
  score: number          // 0.0 - 1.0
  reasons: string[]      // Human-readable scoring breakdown
  tokens: {
    catalogNormalized: string
    lensfunNormalized: string
    catalogTokens: string[]
    lensfunTokens: string[]
  }
  breakdown: {
    makerScore: number
    modelScore: number
    mountScore: number
    specScore: number
  }
}

/**
 * Normalize a string for matching:
 * - Lowercase
 * - Remove punctuation (except hyphens and dots in numbers)
 * - Normalize hyphens (– to -)
 * - Normalize "mm" and "f" formatting
 * - Collapse whitespace
 */
export function normalizeString(text: string): string {
  return text
    .toLowerCase()
    .replace(/[–—]/g, '-')                    // Normalize dashes
    // Only treat standalone "f" as aperture marker (avoid corrupting "ef 24" into "f24")
    .replace(/\bf\s*\/\s*/gi, 'f')           // "f / 2.8" → "f2.8"
    .replace(/\bf\s*(\d)/gi, 'f$1')          // "f 2.8" → "f2.8"
    .replace(/(\d+)\s*mm/gi, '$1mm')         // "24 mm" → "24mm"
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1-$2')  // "24 - 105" → "24-105"
    .replace(/[^\w\s\-\.]/g, ' ')            // Remove punctuation except - and .
    .replace(/\s+/g, ' ')                    // Collapse whitespace
    .trim()
}

function extractFocalSignature(normalized: string): {
  primes: number[]
  ranges: Array<{ min: number; max: number }>
} {
  const primes: number[] = []
  const ranges: Array<{ min: number; max: number }> = []

  const rangeMatches = normalized.matchAll(/\b(\d{1,4}(?:\.\d+)?)\s*-\s*(\d{1,4}(?:\.\d+)?)mm\b/g)
  for (const m of rangeMatches) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      ranges.push({ min: Math.min(a, b), max: Math.max(a, b) })
    }
  }

  const primeMatches = normalized.matchAll(/\b(\d{1,4}(?:\.\d+)?)mm\b/g)
  for (const m of primeMatches) {
    const a = Number(m[1])
    if (Number.isFinite(a)) primes.push(a)
  }

  return { primes, ranges }
}

function extractApertureSignature(normalized: string): { mins: number[]; maxs: number[] } {
  const mins: number[] = []
  const maxs: number[] = []

  // Variable max aperture like f4.5-5.6
  const rangeMatches = normalized.matchAll(/\bf(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/g)
  for (const m of rangeMatches) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      mins.push(Math.min(a, b))
      maxs.push(Math.max(a, b))
    }
  }

  // Single max aperture like f2.8
  const singleMatches = normalized.matchAll(/\bf(\d+(?:\.\d+)?)\b/g)
  for (const m of singleMatches) {
    const a = Number(m[1])
    if (Number.isFinite(a)) {
      mins.push(a)
      maxs.push(a)
    }
  }

  return { mins, maxs }
}

/**
 * Extract key tokens from a model string for matching
 * Returns: focal ranges, apertures, series markers, etc.
 */
export function extractKeyTokens(normalized: string): string[] {
  const tokens: string[] = []
  
  // Focal length ranges (e.g., "24-105", "70-200")
  const focalRanges = normalized.match(/(\d{1,4}(?:\.\d+)?)\s*-\s*(\d{1,4}(?:\.\d+)?)\s*mm/g)
  if (focalRanges) tokens.push(...focalRanges)
  
  // Single focal lengths (e.g., "50mm", "85mm")
  const focalSingle = normalized.match(/\b(\d{1,4}(?:\.\d+)?)mm\b/g)
  if (focalSingle) tokens.push(...focalSingle)
  
  // Apertures (e.g., "f2.8", "f4")
  const apertures = normalized.match(/\bf\d+\.?\d*/g)
  if (apertures) tokens.push(...apertures)

  // Aperture ranges (e.g., "f4.5-5.6")
  const apertureRanges = normalized.match(/\bf\d+\.?\d*\s*-\s*\d+\.?\d*/g)
  if (apertureRanges) tokens.push(...apertureRanges.map(t => t.replace(/\s+/g, '')))
  
  // Series markers
  const series = normalized.match(/\b(l|gm|art|sp|macro|is|usm|vc|di|oss|wr|ed|afs|vr)\b/g)
  if (series) tokens.push(...series)
  
  // Mount indicators
  const mounts = normalized.match(/\b(ef|efs|efm|rf|fe|e|fx|dx|zm|xf|xc|mft|ft)\b/g)
  if (mounts) tokens.push(...mounts)
  
  return tokens
}

/**
 * Check if two makers match, considering aliases
 */
function checkMakerMatch(catalogMaker: string, lensfunMaker: string): number {
  const cat = normalizeString(catalogMaker)
  const lens = normalizeString(lensfunMaker)
  
  // Exact match
  if (cat === lens) return 1.0
  
  // Check aliases
  for (const [canonical, aliases] of Object.entries(MAKER_ALIASES)) {
    const catMatch = cat === canonical || aliases.some(a => cat.includes(a))
    const lensMatch = lens === canonical || aliases.some(a => lens.includes(a))
    if (catMatch && lensMatch) return 0.95
  }
  
  // Partial match (one contains the other)
  if (cat.includes(lens) || lens.includes(cat)) return 0.8
  
  // String similarity fallback
  const similarity = compareTwoStrings(cat, lens)
  return similarity > 0.7 ? similarity * 0.7 : 0.0
}

/**
 * Check mount compatibility
 */
function checkMountMatch(
  catalogSpecs: CatalogItem['specifications'],
  lensfunMounts: string[]
): number {
  if (!catalogSpecs) return 0.5 // Neutral if catalog has no mount info
  
  const catalogMounts = [
    ...(catalogSpecs.mount ? [catalogSpecs.mount] : []),
    ...(catalogSpecs.mounts || [])
  ].map(normalizeString)
  
  if (catalogMounts.length === 0) return 0.5 // Neutral
  
  const lensfunNormalized = lensfunMounts.map(normalizeString)
  
  // Check for overlap
  for (const catMount of catalogMounts) {
    for (const lensMount of lensfunNormalized) {
      if (catMount === lensMount) return 1.0
      if (catMount.includes(lensMount) || lensMount.includes(catMount)) return 0.9
    }
  }
  
  // Check for known incompatibilities
  const hasRF = catalogMounts.some(m => m.includes('rf'))
  const hasEF = lensfunNormalized.some(m => m.includes('ef') && !m.includes('rf'))
  if (hasRF && hasEF) return 0.1 // Strong penalty
  
  return 0.2 // No match
}

/**
 * Check specification consistency (focal length, aperture)
 */
function checkSpecConsistency(
  catalogSpecs: CatalogItem['specifications'],
  lensfunLens: LensfunLens
): number {
  if (!catalogSpecs) return 0.5 // Neutral
  
  let score = 0.5
  let checks = 0
  
  // Focal length check
  if (catalogSpecs.focal_min_mm && lensfunLens.focalMin) {
    checks++
    const diff = Math.abs(catalogSpecs.focal_min_mm - lensfunLens.focalMin)
    if (diff === 0) score += 0.25
    else if (diff <= 2) score += 0.15
    else if (diff <= 5) score += 0.05
    else score -= 0.1
  }
  
  if (catalogSpecs.focal_max_mm && lensfunLens.focalMax) {
    checks++
    const diff = Math.abs(catalogSpecs.focal_max_mm - lensfunLens.focalMax)
    if (diff === 0) score += 0.25
    else if (diff <= 2) score += 0.15
    else if (diff <= 5) score += 0.05
    else score -= 0.1
  }
  
  // Aperture check
  if (catalogSpecs.aperture_min && lensfunLens.apertureMin) {
    checks++
    const diff = Math.abs(catalogSpecs.aperture_min - lensfunLens.apertureMin)
    if (diff === 0) score += 0.25
    else if (diff <= 0.5) score += 0.15
    else score -= 0.1
  }
  
  return checks > 0 ? Math.max(0, Math.min(1, score)) : 0.5
}

/**
 * CANONICAL MATCH SCORING FUNCTION
 * 
 * This is the ONLY function that should compute Lensfun match scores.
 */
export function computeLensfunMatchConfidence(
  catalogItem: CatalogItem,
  lensfunLens: LensfunLens
): MatchResult {
  const reasons: string[] = []
  
  // Step 1: Normalize strings
  const catalogNormalized = normalizeString(catalogItem.output_text)
  const lensfunNormalized = normalizeString(lensfunLens.model)
  
  const catalogTokens = extractKeyTokens(catalogNormalized)
  const lensfunTokens = extractKeyTokens(lensfunNormalized)
  
  // Step 2: Maker matching (25% weight)
  const makerScore = checkMakerMatch(catalogItem.make, lensfunLens.maker)
  reasons.push(`Maker match: ${(makerScore * 100).toFixed(0)}% (${catalogItem.make} vs ${lensfunLens.maker})`)
  
  // Step 3: Model similarity (50% weight)
  const baseModelSimilarity = compareTwoStrings(catalogNormalized, lensfunNormalized)
  
  // Boost for matching key tokens
  let tokenBoost = 0
  const matchingTokens: string[] = []
  for (const catToken of catalogTokens) {
    if (lensfunTokens.some(lt => lt.includes(catToken) || catToken.includes(lt))) {
      matchingTokens.push(catToken)
      tokenBoost += 0.05
    }
  }
  
  const modelScore = Math.min(1.0, baseModelSimilarity + tokenBoost)
  reasons.push(`Model similarity: ${(baseModelSimilarity * 100).toFixed(0)}% base, +${(tokenBoost * 100).toFixed(0)}% token boost = ${(modelScore * 100).toFixed(0)}%`)
  if (matchingTokens.length > 0) {
    reasons.push(`  Matching tokens: ${matchingTokens.join(', ')}`)
  }

  // Step 3b: Hard penalties for obvious focal/aperture token mismatches (prevents 500mm → 300mm)
  const catFocal = extractFocalSignature(catalogNormalized)
  const lensFocalFromText = extractFocalSignature(lensfunNormalized)
  const lensFocalMin = lensfunLens.focalMin ?? (lensFocalFromText.primes[0] ?? lensFocalFromText.ranges[0]?.min ?? null)
  const lensFocalMax = lensfunLens.focalMax ?? (lensFocalFromText.ranges[0]?.max ?? lensFocalFromText.primes[0] ?? null)

  const catAperture = extractApertureSignature(catalogNormalized)
  const lensApertureMin = lensfunLens.apertureMin ?? null
  const lensApertureMax = lensfunLens.apertureMax ?? null

  let focalMismatchHuge = false
  // If catalog mentions a specific prime focal (largest mm token), ensure candidate range contains it.
  if (catFocal.primes.length > 0 && lensFocalMin !== null) {
    const catPrime = Math.max(...catFocal.primes)
    const min = lensFocalMin
    const max = lensFocalMax ?? lensFocalMin
    const within = catPrime >= (min - 1) && catPrime <= (max + 1)
    if (!within) {
      const nearest = catPrime < min ? min : max
      const diff = Math.abs(catPrime - nearest)
      const ratio = nearest > 0 ? catPrime / nearest : Infinity
      if (diff >= 50 && ratio >= 1.25) {
        focalMismatchHuge = true
        reasons.push(`FOCAL MISMATCH HUGE: catalog has ${catPrime}mm, candidate range is ${min}-${max}mm (diff ${diff}mm)`)
      } else {
        reasons.push(`Focal mismatch: catalog has ${catPrime}mm, candidate range is ${min}-${max}mm`)
      }
    }
  }

  let apertureMismatch = false
  if (catAperture.mins.length > 0 && lensApertureMin !== null) {
    const catMin = Math.min(...catAperture.mins)
    const diff = Math.abs(catMin - lensApertureMin)
    if (diff >= 0.7) {
      apertureMismatch = true
      reasons.push(`Aperture mismatch: catalog has f${catMin}, candidate has f${lensApertureMin} (diff ${diff.toFixed(1)})`)
    }
  }
  
  // Step 4: Mount compatibility (15% weight)
  const mountScore = checkMountMatch(catalogItem.specifications, lensfunLens.mounts)
  reasons.push(`Mount compatibility: ${(mountScore * 100).toFixed(0)}% (catalog: ${catalogItem.specifications?.mount || catalogItem.specifications?.mounts?.join(',') || 'none'}, lensfun: ${lensfunLens.mounts.join(',')})`)
  
  // Step 5: Spec consistency (10% weight)
  const specScore = checkSpecConsistency(catalogItem.specifications, lensfunLens)
  reasons.push(`Spec consistency: ${(specScore * 100).toFixed(0)}%`)
  
  // Calculate weighted final score
  let finalScore = (
    makerScore * 0.25 +
    modelScore * 0.50 +
    mountScore * 0.15 +
    specScore * 0.10
  )

  // Apply penalties after weighting so they affect the final decision
  if (focalMismatchHuge) {
    // Hard reject unless extremely high confidence
    if (finalScore < 0.95) {
      finalScore = Math.min(finalScore, 0.64) // force below suggest/auto thresholds
      reasons.push(`HARD REJECT: huge focal mismatch → clamped score to ${(finalScore * 100).toFixed(1)}%`)
    } else {
      reasons.push('HARD REJECT bypassed: score >= 95% despite focal mismatch (manual review recommended)')
    }
  }
  if (apertureMismatch) {
    finalScore = Math.max(0, finalScore - 0.08)
    reasons.push(`Penalty: aperture mismatch → -8% (new score ${(finalScore * 100).toFixed(1)}%)`)
  }
  
  reasons.push(`FINAL SCORE: ${(finalScore * 100).toFixed(1)}% (weights: maker 25%, model 50%, mount 15%, spec 10%)`)
  
  return {
    score: finalScore,
    reasons,
    tokens: {
      catalogNormalized,
      lensfunNormalized,
      catalogTokens,
      lensfunTokens
    },
    breakdown: {
      makerScore,
      modelScore,
      mountScore,
      specScore
    }
  }
}

/**
 * Find best Lensfun matches for a catalog item
 * 
 * @param catalogItem - The catalog item to match
 * @param candidates - Array of Lensfun lenses to consider
 * @param topN - Number of top matches to return (default 5)
 * @returns Sorted array of matches with scores >= 0.5
 */
export function findBestLensfunMatches(
  catalogItem: CatalogItem,
  candidates: LensfunLens[],
  topN: number = 5
): Array<{ lens: LensfunLens; match: MatchResult }> {
  const matches = candidates
    .map(lens => ({
      lens,
      match: computeLensfunMatchConfidence(catalogItem, lens)
    }))
    .filter(m => m.match.score >= 0.5) // Only keep reasonable matches
    .sort((a, b) => b.match.score - a.match.score) // Sort descending
    .slice(0, topN) // Take top N
  
  return matches
}

/**
 * Get confidence level description for UI
 */
export function getConfidenceLevel(score: number): {
  level: 'high' | 'medium' | 'low'
  action: 'auto' | 'suggest' | 'skip'
  color: string
} {
  if (score >= 0.85) {
    return { level: 'high', action: 'auto', color: 'green' }
  } else if (score >= 0.65) {
    return { level: 'medium', action: 'suggest', color: 'yellow' }
  } else {
    return { level: 'low', action: 'skip', color: 'red' }
  }
}
