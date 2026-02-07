import { prisma } from "@/lib/prisma"
import { generateSKU } from "@/lib/sku"

interface VerifiedItemWithRelations {
  id: string
  productId: string
  serialNumber: string | null
  verifiedCondition: string
  generalNotes: string | null
  notInterested: boolean
  requiresRepair: boolean
  repairNotes: string | null
  product: {
    id: string
    name: string
    brand: string
    model: string
    productType: string
  }
  pricingSnapshot: {
    finalBuyPrice: any
    finalConsignPrice: any
  } | null
  priceOverride: {
    overrideBuyPrice: any | null
    overrideConsignPrice: any | null
  } | null
  incomingItem: {
    id: string
    clientSelection: string | null
    clientImages: string[]
    session: {
      purchase: {
        id: string
        vendorId: string | null
      }
    }
  }
}

/**
 * Create Equipment record from VerifiedGearItem after payment/approval
 * @param verifiedItemId ID of the VerifiedGearItem
 * @param userId ID of the user creating the equipment
 * @param clientId Optional client ID to link
 * @returns Created Equipment record
 */
export async function createEquipmentFromVerifiedItem(
  verifiedItemId: string,
  userId: string,
  clientId?: string | null
) {
  // Fetch VerifiedGearItem with all relations
  const verifiedItem = await prisma.verifiedGearItem.findUnique({
    where: { id: verifiedItemId },
    include: {
      product: true,
      pricingSnapshot: true,
      priceOverride: true,
      incomingItem: {
        include: {
          session: {
            include: {
              purchase: true,
            },
          },
        },
      },
    },
  }) as VerifiedItemWithRelations | null

  if (!verifiedItem) {
    throw new Error("VerifiedGearItem not found")
  }

  // Skip if marked as not interested
  if (verifiedItem.notInterested) {
    console.log(`Skipping equipment creation for item ${verifiedItemId} - marked as not interested`)
    return null
  }

  const { product, pricingSnapshot, priceOverride, incomingItem } = verifiedItem
  const clientSelection = incomingItem.clientSelection || "BUY"

  // Determine acquisition type
  const acquisitionType = clientSelection === "CONSIGNMENT" ? "CONSIGNMENT" : "PURCHASED_OUTRIGHT"

  // Determine prices
  let purchasePrice: number
  let sellingPrice: number

  if (acquisitionType === "CONSIGNMENT") {
    // Consignment: use consignment price as cost/payout
    if (priceOverride?.overrideConsignPrice) {
      purchasePrice = Number(priceOverride.overrideConsignPrice)
    } else if (pricingSnapshot) {
      purchasePrice = Number(pricingSnapshot.finalConsignPrice)
    } else {
      purchasePrice = 0
    }
    // Selling price to be set during intake
    sellingPrice = purchasePrice * 1.5 // Default markup for consignment
  } else {
    // Buy: use buy price as cost
    if (priceOverride?.overrideBuyPrice) {
      purchasePrice = Number(priceOverride.overrideBuyPrice)
    } else if (pricingSnapshot) {
      purchasePrice = Number(pricingSnapshot.finalBuyPrice)
    } else {
      purchasePrice = 0
    }
    // Selling price to be set during intake
    sellingPrice = purchasePrice * 1.3 // Default markup for purchase
  }

  // Map verified condition to equipment condition
  const conditionMap: Record<string, string> = {
    LIKE_NEW: "MINT",
    EXCELLENT: "EXCELLENT",
    VERY_GOOD: "GOOD",
    GOOD: "GOOD",
    WORN: "FAIR",
  }
  const equipmentCondition = conditionMap[verifiedItem.verifiedCondition] || "GOOD"

  // Generate SKU
  const sku = await generateSKU(product.brand, verifiedItem.serialNumber)

  // Create Equipment record
  const equipment = await prisma.equipment.create({
    data: {
      sku,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.productType as any, // ProductType and EquipmentCategory share same values
      condition: equipmentCondition as any,
      description: verifiedItem.generalNotes,
      serialNumber: verifiedItem.serialNumber,
      acquisitionType: acquisitionType as any,
      vendorId: incomingItem.session.purchase.vendorId,
      purchasePrice,
      sellingPrice,
      costPrice: purchasePrice, // Cost = what we paid
      consignmentRate: acquisitionType === "CONSIGNMENT" ? 70 : null, // Default 70% to vendor
      status: verifiedItem.requiresRepair ? "IN_REPAIR" : "PENDING_INSPECTION",
      intakeStatus: "PENDING_INTAKE",
      inRepair: verifiedItem.requiresRepair,
      images: incomingItem.clientImages || [],
      sourceVerifiedItemId: verifiedItem.id,
      clientId: clientId || null,
      createdById: userId,
    },
  })

  // Create RepairLog if repair is required
  if (verifiedItem.requiresRepair && verifiedItem.repairNotes) {
    await prisma.repairLog.create({
      data: {
        equipmentId: equipment.id,
        technicianName: "Unassigned",
        issue: verifiedItem.repairNotes,
        status: "SENT_TO_TECH",
        createdById: userId,
      },
    })
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: "CREATED_EQUIPMENT_FROM_INSPECTION",
      entityType: "EQUIPMENT",
      entityId: equipment.id,
      details: JSON.stringify({
        verifiedItemId: verifiedItem.id,
        productName: product.name,
        acquisitionType,
        requiresRepair: verifiedItem.requiresRepair,
        sku: equipment.sku,
      }),
    },
  })

  console.log(`✅ Created Equipment ${equipment.sku} from VerifiedGearItem ${verifiedItemId}`)

  return equipment
}

/**
 * Create multiple Equipment records from an inspection session
 * @param purchaseId ID of the PendingPurchase
 * @param userId ID of the user creating the equipment
 * @returns Array of created Equipment records
 */
export async function createEquipmentFromInspection(
  purchaseId: string,
  userId: string
) {
  // Get purchase with inspection session and all verified items
  const purchase = await prisma.pendingPurchase.findUnique({
    where: { id: purchaseId },
    include: {
      inspectionSession: {
        include: {
          incomingItems: {
            include: {
              verifiedItem: {
                include: {
                  product: true,
                  pricingSnapshot: true,
                  priceOverride: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!purchase || !purchase.inspectionSession) {
    throw new Error("Purchase or inspection session not found")
  }

  const createdEquipment = []

  for (const incomingItem of purchase.inspectionSession.incomingItems) {
    if (!incomingItem.verifiedItem) {
      console.warn(`Skipping incoming item ${incomingItem.id} - no verified item`)
      continue
    }

    try {
      const equipment = await createEquipmentFromVerifiedItem(
        incomingItem.verifiedItem.id,
        userId,
        null // clientId will be added in Phase 8
      )

      if (equipment) {
        createdEquipment.push(equipment)
      }
    } catch (error) {
      console.error(`Failed to create equipment from item ${incomingItem.id}:`, error)
      // Continue with other items even if one fails
    }
  }

  console.log(`✅ Created ${createdEquipment.length} equipment records from purchase ${purchaseId}`)

  return createdEquipment
}
