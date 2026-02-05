import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, VerifiedCondition } from "@prisma/client"
import { computePricing, calculateAccessoryPenalty } from "@/lib/inspection-pricing"

// GET /api/inspections/items/[itemId] - Get item with verification details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await params

    console.log(`🔍 Fetching item with ID: ${itemId}`)
    
    const item = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: {
        session: {
          include: {
            vendor: true
          }
        },
        verifiedItem: {
          include: {
            product: {
              include: {
                accessories: {
                  orderBy: { accessoryOrder: "asc" }
                },
                knownIssues: true,
                questionTemplates: {
                  orderBy: { questionOrder: "asc" }
                }
              }
            },
            answers: true,
            accessories: true,
            pricingSnapshot: true,
            priceOverride: {
              include: {
                overriddenBy: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            verifiedBy: {
              select: { id: true, name: true, email: true }
            },
            approvedBy: {
              select: { id: true, name: true, email: true }
            },
            reopenedBy: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!item) {
      console.error(`❌ Item not found with ID: ${itemId}`)
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    console.log(`✅ Item found: ${item.clientName}`)
    return NextResponse.json({ item }, { status: 200 })
  } catch (error: any) {
    console.error("GET /api/inspections/items/[itemId] error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch item" }, { status: 500 })
  }
}

// POST /api/inspections/items/[itemId] - Create/update verified item (identify product)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await params
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Check if item exists
    const incomingItem = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: { verifiedItem: true }
    })

    if (!incomingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Get product details for initial data
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        accessories: {
          orderBy: { accessoryOrder: "asc" }
        },
        questionTemplates: {
          orderBy: { questionOrder: "asc" }
        },
        knownIssues: {
          where: { autoInjectQuestion: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    let verifiedItem

    if (incomingItem.verifiedItem) {
      // Update existing verified item (re-identification)
      console.log(`🔄 RE-IDENTIFYING product for item ${itemId}:`, {
        oldProduct: incomingItem.verifiedItem.productId,
        newProduct: productId,
        newProductName: product.name
      })
      
      // First, delete related records that might not exist
      await prisma.verifiedAnswer.deleteMany({
        where: { verifiedItemId: incomingItem.verifiedItem.id }
      })
      
      await prisma.verifiedAccessory.deleteMany({
        where: { verifiedItemId: incomingItem.verifiedItem.id }
      })
      
      // Delete pricing snapshot if it exists
      await prisma.pricingSnapshot.deleteMany({
        where: { verifiedItemId: incomingItem.verifiedItem.id }
      })
      
      // Delete price override if it exists
      await prisma.priceOverride.deleteMany({
        where: { verifiedItemId: incomingItem.verifiedItem.id }
      })
      
      // Now update the verified item with new product
      verifiedItem = await prisma.verifiedGearItem.update({
        where: { id: incomingItem.verifiedItem.id },
        data: {
          productId
        },
        include: {
          product: {
            include: {
              accessories: {
                orderBy: { accessoryOrder: "asc" }
              },
              questionTemplates: {
                orderBy: { questionOrder: "asc" }
              },
              knownIssues: true
            }
          }
        }
      })

      // Update incoming item name to the new product name
      const updatedIncomingItem = await prisma.incomingGearItem.update({
        where: { id: itemId },
        data: { clientName: product.name }
      })
      
      console.log(`✅ Updated IncomingGearItem clientName from "${incomingItem.clientName}" to "${updatedIncomingItem.clientName}"`)

      // Log re-identification
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "RE_IDENTIFIED_PRODUCT",
          entityType: "VERIFIED_GEAR_ITEM",
          entityId: verifiedItem.id,
          details: JSON.stringify({
            oldProductId: incomingItem.verifiedItem.productId,
            newProductId: productId,
            productName: product.name
          })
        }
      })
    } else {
      // Create new verified item
      console.log(`✨ IDENTIFYING new product for item ${itemId}:`, {
        product: productId,
        productName: product.name
      })
      
      verifiedItem = await prisma.verifiedGearItem.create({
        data: {
          incomingItemId: itemId,
          productId,
          verifiedCondition: VerifiedCondition.GOOD, // Default
          serialNumber: incomingItem.clientSerialNumber
        },
        include: {
          product: {
            include: {
              accessories: {
                orderBy: { accessoryOrder: "asc" }
              },
              questionTemplates: {
                orderBy: { questionOrder: "asc" }
              },
              knownIssues: true
            }
          }
        }
      })

      // Update incoming item status and name
      const updatedIncomingItem = await prisma.incomingGearItem.update({
        where: { id: itemId },
        data: { 
          inspectionStatus: "IN_PROGRESS",
          clientName: product.name // Update to the identified product name
        }
      })
      
      console.log(`✅ Updated IncomingGearItem clientName from "${incomingItem.clientName}" to "${updatedIncomingItem.clientName}"`)

      // Log identification
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "IDENTIFIED_PRODUCT",
          entityType: "VERIFIED_GEAR_ITEM",
          entityId: verifiedItem.id,
          details: JSON.stringify({
            productId,
            productName: product.name
          })
        }
      })
    }

    return NextResponse.json({ verifiedItem }, { status: 200 })
  } catch (error: any) {
    console.error("POST /api/inspections/items/[itemId] error:", error)
    return NextResponse.json({ error: error.message || "Failed to identify product" }, { status: 500 })
  }
}

// PATCH /api/inspections/items/[itemId] - Update verification details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await params
    const body = await request.json()
    const {
      serialNumber,
      verifiedCondition,
      generalNotes,
      answers,
      accessories,
      action // "verify", "approve", "reopen", "reject"
    } = body

    // Get incoming item
    const incomingItem = await prisma.incomingGearItem.findUnique({
      where: { id: itemId },
      include: {
        verifiedItem: {
          include: {
            product: true,
            pricingSnapshot: true
          }
        }
      }
    })

    if (!incomingItem || !incomingItem.verifiedItem) {
      return NextResponse.json({ error: "Verified item not found" }, { status: 404 })
    }

    const verifiedItem = incomingItem.verifiedItem

    // Check if locked (approved) and user is not admin
    if (verifiedItem.locked && action !== "reopen" && !hasPermission(session.user.role, UserRole.ADMIN)) {
      return NextResponse.json({ error: "Item is locked. Only admins can modify." }, { status: 403 })
    }

    // Handle different actions
    if (action === "verify") {
      // Update verification details
      const updated = await prisma.verifiedGearItem.update({
        where: { id: verifiedItem.id },
        data: {
          serialNumber,
          verifiedCondition,
          generalNotes,
          verifiedAt: new Date(),
          verifiedById: session.user.id
        }
      })

      // Update/create answers
      if (answers && Array.isArray(answers)) {
        // Delete existing answers
        await prisma.verifiedAnswer.deleteMany({
          where: { verifiedItemId: verifiedItem.id }
        })

        // Create new answers
        await prisma.verifiedAnswer.createMany({
          data: answers.map((answer: any) => ({
            verifiedItemId: verifiedItem.id,
            questionText: answer.questionText,
            answer: answer.answer,
            notes: answer.notes
          }))
        })
      }

      // Update/create accessories
      if (accessories && Array.isArray(accessories)) {
        // Delete existing
        await prisma.verifiedAccessory.deleteMany({
          where: { verifiedItemId: verifiedItem.id }
        })

        // Create new
        await prisma.verifiedAccessory.createMany({
          data: accessories.map((acc: any) => ({
            verifiedItemId: verifiedItem.id,
            accessoryName: acc.accessoryName,
            isPresent: acc.isPresent,
            notes: acc.notes
          }))
        })
      }

      // Compute pricing if condition is set
      if (verifiedCondition) {
        const product = verifiedItem.product

        // Get accessories with penalties
        const accessoriesWithPenalties = await prisma.verifiedAccessory.findMany({
          where: { verifiedItemId: verifiedItem.id },
          select: {
            accessoryName: true,
            isPresent: true
          }
        })

        // Get penalty amounts from templates
        const accessoryTemplates = await prisma.accessoryTemplate.findMany({
          where: { productId: product.id }
        })

        const accessoriesForPenalty = accessoriesWithPenalties.map(acc => {
          const template = accessoryTemplates.find(t => t.accessoryName === acc.accessoryName)
          return {
            accessoryName: acc.accessoryName,
            isPresent: acc.isPresent,
            penaltyAmount: template?.penaltyAmount ? Number(template.penaltyAmount) : 0
          }
        })

        const accessoryPenalty = calculateAccessoryPenalty(accessoriesForPenalty)

        const pricing = computePricing({
          baseBuyMin: Number(product.buyPriceMin),
          baseBuyMax: Number(product.buyPriceMax),
          baseConsignMin: Number(product.consignPriceMin),
          baseConsignMax: Number(product.consignPriceMax),
          condition: verifiedCondition as VerifiedCondition,
          accessoryPenalty
        })

        // Create or update pricing snapshot
        await prisma.pricingSnapshot.upsert({
          where: { verifiedItemId: verifiedItem.id },
          update: {
            baseBuyMin: product.buyPriceMin,
            baseBuyMax: product.buyPriceMax,
            baseConsignMin: product.consignPriceMin,
            baseConsignMax: product.consignPriceMax,
            conditionMultiplier: pricing.conditionMultiplier,
            computedBuyPrice: pricing.computedBuyPrice,
            computedConsignPrice: pricing.computedConsignPrice,
            accessoryPenalty: pricing.accessoryPenalty,
            totalPenalty: pricing.totalPenalty,
            finalBuyPrice: pricing.finalBuyPrice,
            finalConsignPrice: pricing.finalConsignPrice
          },
          create: {
            verifiedItemId: verifiedItem.id,
            baseBuyMin: product.buyPriceMin,
            baseBuyMax: product.buyPriceMax,
            baseConsignMin: product.consignPriceMin,
            baseConsignMax: product.consignPriceMax,
            conditionMultiplier: pricing.conditionMultiplier,
            computedBuyPrice: pricing.computedBuyPrice,
            computedConsignPrice: pricing.computedConsignPrice,
            accessoryPenalty: pricing.accessoryPenalty,
            totalPenalty: pricing.totalPenalty,
            finalBuyPrice: pricing.finalBuyPrice,
            finalConsignPrice: pricing.finalConsignPrice
          }
        })
      }

      // Update incoming item status
      await prisma.incomingGearItem.update({
        where: { id: itemId },
        data: { inspectionStatus: "VERIFIED" }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "VERIFIED_ITEM",
          entityType: "VERIFIED_GEAR_ITEM",
          entityId: verifiedItem.id,
          details: JSON.stringify({ condition: verifiedCondition })
        }
      })

      return NextResponse.json({ success: true, message: "Item verified" }, { status: 200 })
    }

    if (action === "approve") {
      // Approve and lock the item
      await prisma.verifiedGearItem.update({
        where: { id: verifiedItem.id },
        data: {
          approvedAt: new Date(),
          approvedById: session.user.id,
          locked: true
        }
      })

      // Update incoming item status
      await prisma.incomingGearItem.update({
        where: { id: itemId },
        data: { inspectionStatus: "APPROVED" }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "APPROVED_VERIFIED_ITEM",
          entityType: "VERIFIED_GEAR_ITEM",
          entityId: verifiedItem.id,
          details: JSON.stringify({ approvedAt: new Date() })
        }
      })

      return NextResponse.json({ success: true, message: "Item approved" }, { status: 200 })
    }

    if (action === "reopen") {
      // Only admins can reopen
      if (!hasPermission(session.user.role, UserRole.ADMIN)) {
        return NextResponse.json({ error: "Only admins can reopen approved items" }, { status: 403 })
      }

      const { reopenReason } = body

      if (!reopenReason) {
        return NextResponse.json({ error: "Reopen reason is required" }, { status: 400 })
      }

      await prisma.verifiedGearItem.update({
        where: { id: verifiedItem.id },
        data: {
          locked: false,
          reopenedAt: new Date(),
          reopenedById: session.user.id,
          reopenReason
        }
      })

      // Update incoming item status
      await prisma.incomingGearItem.update({
        where: { id: itemId },
        data: { inspectionStatus: "REOPENED" }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "REOPENED_VERIFIED_ITEM",
          entityType: "VERIFIED_GEAR_ITEM",
          entityId: verifiedItem.id,
          details: JSON.stringify({ reason: reopenReason })
        }
      })

      return NextResponse.json({ success: true, message: "Item reopened" }, { status: 200 })
    }

    if (action === "reject") {
      await prisma.incomingGearItem.update({
        where: { id: itemId },
        data: { inspectionStatus: "REJECTED" }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "REJECTED_ITEM",
          entityType: "INCOMING_GEAR_ITEM",
          entityId: itemId,
          details: JSON.stringify({ reason: generalNotes })
        }
      })

      return NextResponse.json({ success: true, message: "Item rejected" }, { status: 200 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("PATCH /api/inspections/items/[itemId] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 })
  }
}
