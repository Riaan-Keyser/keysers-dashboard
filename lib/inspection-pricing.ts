import { VerifiedCondition, Prisma } from "@prisma/client"

// Condition multipliers for pricing calculation
export const CONDITION_MULTIPLIERS: Record<VerifiedCondition, number> = {
  LIKE_NEW: 1.00,
  EXCELLENT: 0.95,
  VERY_GOOD: 0.90,
  GOOD: 0.82,
  WORN: 0.70,
}

/**
 * Compute pricing for a verified item
 */
export function computePricing({
  baseBuyMin,
  baseBuyMax,
  baseConsignMin,
  baseConsignMax,
  condition,
  accessoryPenalty = 0,
}: {
  baseBuyMin: number
  baseBuyMax: number
  baseConsignMin: number
  baseConsignMax: number
  condition: VerifiedCondition
  accessoryPenalty?: number
}) {
  // Get condition multiplier
  const multiplier = CONDITION_MULTIPLIERS[condition]

  // Compute prices using the high end of the range
  const computedBuyPrice = Math.round(baseBuyMax * multiplier)
  const computedConsignPrice = Math.round(baseConsignMax * multiplier)

  // Apply penalties
  const finalBuyPrice = Math.max(0, computedBuyPrice - accessoryPenalty)
  const finalConsignPrice = Math.max(0, computedConsignPrice - accessoryPenalty)

  return {
    conditionMultiplier: multiplier,
    computedBuyPrice,
    computedConsignPrice,
    accessoryPenalty,
    totalPenalty: accessoryPenalty,
    finalBuyPrice,
    finalConsignPrice,
  }
}

/**
 * Calculate accessory penalty based on missing accessories
 */
export function calculateAccessoryPenalty(
  accessories: Array<{ accessoryName: string; isPresent: boolean; penaltyAmount?: number | null }>
): number {
  return accessories.reduce((total, acc) => {
    if (!acc.isPresent && acc.penaltyAmount) {
      return total + Number(acc.penaltyAmount)
    }
    return total
  }, 0)
}

/**
 * Get final price for display (considers override if present)
 */
export function getFinalDisplayPrice({
  autoBuyPrice,
  autoConsignPrice,
  overrideBuyPrice,
  overrideConsignPrice,
}: {
  autoBuyPrice: number
  autoConsignPrice: number
  overrideBuyPrice?: number | null
  overrideConsignPrice?: number | null
}): {
  finalBuyPrice: number
  finalConsignPrice: number
  isBuyOverridden: boolean
  isConsignOverridden: boolean
} {
  return {
    finalBuyPrice: overrideBuyPrice ?? autoBuyPrice,
    finalConsignPrice: overrideConsignPrice ?? autoConsignPrice,
    isBuyOverridden: overrideBuyPrice !== null && overrideBuyPrice !== undefined,
    isConsignOverridden: overrideConsignPrice !== null && overrideConsignPrice !== undefined,
  }
}

/**
 * Format price for display (South African format)
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-"
  const rounded = Math.round(amount)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `R${formatted}`
}
