import { prisma } from "@/lib/prisma"

interface PriceRecommendation {
  recommendedPrice: number
  averagePrice: number
  medianPrice: number
  minPrice: number
  maxPrice: number
  sampleSize: number
  confidence: "high" | "medium" | "low"
  pricesByCondition: Record<string, number>
}

/**
 * Calculate price recommendation based on historical sales data
 * @param productId Product ID from catalog (if available)
 * @param brand Equipment brand
 * @param model Equipment model
 * @param condition Equipment condition
 * @returns Price recommendation with statistics
 */
export async function getPriceRecommendation(
  productId: string | null,
  brand: string,
  model: string,
  condition: string
): Promise<PriceRecommendation> {
  try {
    // Query 1: Find equipment with same Product (exact match)
    let soldEquipment = []

    if (productId) {
      soldEquipment = await prisma.equipment.findMany({
        where: {
          status: "SOLD",
          sourceVerifiedItemId: {
            not: null,
          },
        },
        include: {
          verifiedItem: {
            where: {
              productId,
            },
          },
        },
      })

      // Filter to only those that actually match the product
      soldEquipment = soldEquipment.filter(e => e.verifiedItem !== null)
    }

    // Query 2: If not enough data, find equipment with same brand+model (fuzzy match)
    if (soldEquipment.length < 3) {
      const brandModelEquipment = await prisma.equipment.findMany({
        where: {
          status: "SOLD",
          brand: {
            contains: brand,
            mode: "insensitive",
          },
          model: {
            contains: model,
            mode: "insensitive",
          },
        },
      })

      soldEquipment = [...soldEquipment, ...brandModelEquipment]
    }

    // If no historical data, return fallback
    if (soldEquipment.length === 0) {
      return {
        recommendedPrice: 0,
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        sampleSize: 0,
        confidence: "low",
        pricesByCondition: {},
      }
    }

    // Extract selling prices
    const prices = soldEquipment.map(e => Number(e.sellingPrice)).filter(p => p > 0)

    if (prices.length === 0) {
      return {
        recommendedPrice: 0,
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        sampleSize: 0,
        confidence: "low",
        pricesByCondition: {},
      }
    }

    // Calculate statistics
    const sortedPrices = prices.sort((a, b) => a - b)
    const averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    const medianPrice = Math.round(
      prices.length % 2 === 0
        ? (sortedPrices[prices.length / 2 - 1] + sortedPrices[prices.length / 2]) / 2
        : sortedPrices[Math.floor(prices.length / 2)]
    )
    const minPrice = sortedPrices[0]
    const maxPrice = sortedPrices[sortedPrices.length - 1]

    // Calculate average by condition
    const pricesByCondition: Record<string, number> = {}
    const conditionGroups = soldEquipment.reduce((acc, e) => {
      const cond = e.condition
      if (!acc[cond]) acc[cond] = []
      acc[cond].push(Number(e.sellingPrice))
      return acc
    }, {} as Record<string, number[]>)

    for (const [cond, condPrices] of Object.entries(conditionGroups)) {
      pricesByCondition[cond] = Math.round(
        condPrices.reduce((a, b) => a + b, 0) / condPrices.length
      )
    }

    // Determine confidence level
    let confidence: "high" | "medium" | "low"
    if (prices.length >= 5) {
      confidence = "high"
    } else if (prices.length >= 2) {
      confidence = "medium"
    } else {
      confidence = "low"
    }

    // Recommended price: Use condition-specific average if available, otherwise overall average
    const recommendedPrice = pricesByCondition[condition] || averagePrice

    return {
      recommendedPrice,
      averagePrice,
      medianPrice,
      minPrice,
      maxPrice,
      sampleSize: prices.length,
      confidence,
      pricesByCondition,
    }
  } catch (error) {
    console.error("Failed to calculate price recommendation:", error)
    throw error
  }
}
