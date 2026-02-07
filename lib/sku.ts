import { prisma } from "@/lib/prisma"

// Brand prefix mapping
const BRAND_PREFIXES: Record<string, string> = {
  Canon: "CA",
  Nikon: "NI",
  Sony: "SO",
  Fuji: "FU",
  Fujifilm: "FU",
  Leica: "LE",
  Sigma: "SI",
  Tamron: "TA",
  Panasonic: "PA",
  Olympus: "OL",
  Hasselblad: "HA",
  Pentax: "PE",
  DJI: "DJ",
  GoPro: "GP",
  Zeiss: "ZE",
  Godox: "GO",
}

/**
 * Generate a unique SKU for equipment
 * Format: PREFIX-XXXX where:
 * - PREFIX is based on brand (CA, NI, SO, etc.) or GE for generic/unknown
 * - XXXX is last 4 digits of serial number if available, otherwise random 4-digit number
 * 
 * @param brand Equipment brand
 * @param serialNumber Equipment serial number (optional)
 * @returns A unique SKU
 */
export async function generateSKU(brand: string, serialNumber?: string | null): Promise<string> {
  // Determine prefix from brand
  const brandKey = Object.keys(BRAND_PREFIXES).find(
    key => brand.toLowerCase().includes(key.toLowerCase())
  )
  const prefix = brandKey ? BRAND_PREFIXES[brandKey] : "GE"

  // Determine suffix
  let suffix: string
  
  if (serialNumber && serialNumber.length >= 4) {
    // Use last 4 digits/chars of serial number
    suffix = serialNumber.slice(-4).toUpperCase()
  } else {
    // Generate random 4-digit number
    suffix = Math.floor(1000 + Math.random() * 9000).toString()
  }

  // Combine to create SKU
  let sku = `${prefix}-${suffix}`

  // Check for uniqueness and regenerate if collision
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const existing = await prisma.equipment.findUnique({
      where: { sku },
    })

    if (!existing) {
      // SKU is unique
      return sku
    }

    // Collision detected, generate new suffix
    suffix = Math.floor(1000 + Math.random() * 9000).toString()
    sku = `${prefix}-${suffix}`
    attempts++
  }

  // If all attempts failed, add timestamp suffix
  const timestamp = Date.now().toString().slice(-4)
  return `${prefix}-${timestamp}`
}

/**
 * Validate if a SKU is available (not already in use)
 * @param sku SKU to validate
 * @param excludeEquipmentId Optional equipment ID to exclude from check (for updates)
 * @returns True if SKU is available
 */
export async function validateSKU(sku: string, excludeEquipmentId?: string): Promise<boolean> {
  const existing = await prisma.equipment.findUnique({
    where: { sku },
  })

  if (!existing) {
    return true
  }

  // If excluding an equipment ID (for updates), check if it's the same one
  if (excludeEquipmentId && existing.id === excludeEquipmentId) {
    return true
  }

  return false
}

/**
 * Get the brand prefix for a given brand name
 * @param brand Brand name
 * @returns Two-letter prefix or "GE" for generic
 */
export function getBrandPrefix(brand: string): string {
  const brandKey = Object.keys(BRAND_PREFIXES).find(
    key => brand.toLowerCase().includes(key.toLowerCase())
  )
  return brandKey ? BRAND_PREFIXES[brandKey] : "GE"
}
