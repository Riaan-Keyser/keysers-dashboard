import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET inspection data for a specific PendingItem
 * Returns either the existing inspection or initializes a new one
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: itemId } = await params

    // Get the PendingItem
    const pendingItem = await prisma.pendingItem.findUnique({
      where: { id: itemId },
      include: {
        pendingPurchase: {
          include: {
            inspectionSession: {
              include: {
                incomingItems: {
                  where: {
                    // Match by name (since we don't have a direct link)
                    clientName: { equals: "" } // We'll filter this properly below
                  },
                  include: {
                    verifiedItem: {
                      include: {
                        product: true,
                        answers: true,
                        accessories: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!pendingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Get the purchase
    const purchase = pendingItem.pendingPurchase

    // Check if inspection session exists, if not create it
    let inspectionSession = purchase.inspectionSession
    
    if (!inspectionSession) {
      // Create inspection session if it doesn't exist
      const sessionCount = await prisma.inspectionSession.count()
      
      inspectionSession = await prisma.inspectionSession.create({
        data: {
          sessionName: `Quote from ${purchase.customerName} - ${new Date().toLocaleDateString()}`,
          shipmentReference: purchase.trackingNumber || undefined,
          vendorId: purchase.vendorId || undefined,
          status: "IN_PROGRESS",
          notes: `Customer Phone: ${purchase.customerPhone}\nCustomer Email: ${purchase.customerEmail || 'Not provided'}`,
          createdById: session.user.id,
          incomingItems: {
            create: await prisma.pendingItem.findMany({
              where: { pendingPurchaseId: purchase.id }
            }).then(items => items.map(item => ({
              clientName: item.name,
              clientBrand: item.brand,
              clientModel: item.model,
              clientCondition: item.condition,
              clientDescription: item.description,
              clientImages: item.imageUrls,
              inspectionStatus: "UNVERIFIED"
            })))
          }
        },
        include: {
          incomingItems: {
            include: {
              verifiedItem: {
                include: {
                  product: true,
                  answers: true,
                  accessories: true
                }
              }
            }
          }
        }
      })

      // Link session to purchase
      await prisma.pendingPurchase.update({
        where: { id: purchase.id },
        data: {
          inspectionSessionId: inspectionSession.id,
          status: "INSPECTION_IN_PROGRESS"
        }
      })
    }

    // Find the corresponding IncomingGearItem (match by name since we don't have direct link yet)
    const incomingItem = inspectionSession.incomingItems.find(
      item => item.clientName === pendingItem.name
    )

    if (!incomingItem) {
      return NextResponse.json({ 
        error: "Incoming item not found in inspection session" 
      }, { status: 404 })
    }

    // Build inspection data response
    const verifiedItem = incomingItem.verifiedItem

    const inspectionData = {
      productId: verifiedItem?.productId || null,
      product: verifiedItem?.product ? {
        id: verifiedItem.product.id,
        name: verifiedItem.product.name,
        brand: verifiedItem.product.brand,
        model: verifiedItem.product.model,
        category: verifiedItem.product.category,
        buyLow: verifiedItem.product.buyLow ? parseFloat(verifiedItem.product.buyLow.toString()) : 0,
        buyHigh: verifiedItem.product.buyHigh ? parseFloat(verifiedItem.product.buyHigh.toString()) : 0,
        consignLow: verifiedItem.product.consignLow ? parseFloat(verifiedItem.product.consignLow.toString()) : 0,
        consignHigh: verifiedItem.product.consignHigh ? parseFloat(verifiedItem.product.consignHigh.toString()) : 0
      } : null,
      condition: verifiedItem?.verifiedCondition || null,
      serialNumber: verifiedItem?.serialNumber || null,
      includedItems: verifiedItem?.accessories?.reduce((acc: any, accessory: any) => {
        acc[accessory.accessoryName] = accessory.isPresent
        return acc
      }, {}) || {},
      conditionChecks: verifiedItem?.answers?.reduce((acc: any, answer: any) => {
        acc[answer.questionText] = answer.answer
        return acc
      }, {}) || {},
      notes: verifiedItem?.generalNotes || "",
      inspectionStatus: incomingItem.inspectionStatus,
      incomingItemId: incomingItem.id
    }

    return NextResponse.json({
      inspection: inspectionData,
      originalProductName: pendingItem.name,
      sessionId: inspectionSession.id
    })

  } catch (error: any) {
    console.error("GET /api/incoming-gear/items/[itemId]/inspection error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to load inspection data" 
    }, { status: 500 })
  }
}

/**
 * PUT/Update inspection data for a specific PendingItem
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: itemId } = await params
    const body = await request.json()

    // Get the PendingItem and its inspection session
    const pendingItem = await prisma.pendingItem.findUnique({
      where: { id: itemId },
      include: {
        pendingPurchase: {
          include: {
            inspectionSession: {
              include: {
                incomingItems: true
              }
            }
          }
        }
      }
    })

    if (!pendingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const inspectionSession = pendingItem.pendingPurchase.inspectionSession
    if (!inspectionSession) {
      return NextResponse.json({ 
        error: "Inspection session not found" 
      }, { status: 404 })
    }

    // Find the IncomingGearItem
    const incomingItem = inspectionSession.incomingItems.find(
      item => item.clientName === pendingItem.name
    )

    if (!incomingItem) {
      return NextResponse.json({ 
        error: "Incoming item not found" 
      }, { status: 404 })
    }

    // Check if product changed (for audit log)
    const existingVerifiedItem = await prisma.verifiedGearItem.findUnique({
      where: { incomingItemId: incomingItem.id }
    })

    const productChanged = existingVerifiedItem && 
                          existingVerifiedItem.productId !== body.productId

    // Upsert VerifiedGearItem
    const verifiedItem = await prisma.verifiedGearItem.upsert({
      where: { incomingItemId: incomingItem.id },
      create: {
        incomingItemId: incomingItem.id,
        productId: body.productId,
        verifiedCondition: body.condition,
        serialNumber: body.serialNumber || null,
        generalNotes: body.notes || null,
        verifiedAt: new Date(),
        verifiedById: session.user.id,
        locked: false
      },
      update: {
        productId: body.productId,
        verifiedCondition: body.condition,
        serialNumber: body.serialNumber || null,
        generalNotes: body.notes || null,
        verifiedAt: new Date(),
        verifiedById: session.user.id
      }
    })

    // Delete existing accessories and answers, then recreate
    await prisma.verifiedAccessory.deleteMany({
      where: { verifiedItemId: verifiedItem.id }
    })
    
    await prisma.verifiedAnswer.deleteMany({
      where: { verifiedItemId: verifiedItem.id }
    })

    // Create new accessories
    if (body.includedItems && Object.keys(body.includedItems).length > 0) {
      await prisma.verifiedAccessory.createMany({
        data: Object.entries(body.includedItems).map(([name, present]) => ({
          verifiedItemId: verifiedItem.id,
          accessoryName: name,
          isPresent: present as boolean,
          notes: null
        }))
      })
    }

    // Create new condition check answers
    if (body.conditionChecks && Object.keys(body.conditionChecks).length > 0) {
      await prisma.verifiedAnswer.createMany({
        data: Object.entries(body.conditionChecks).map(([questionText, answer]) => ({
          verifiedItemId: verifiedItem.id,
          questionText: questionText,
          answer: answer as any,
          notes: null
        }))
      })
    }

    // Update IncomingGearItem status
    await prisma.incomingGearItem.update({
      where: { id: incomingItem.id },
      data: {
        inspectionStatus: "VERIFIED"
      }
    })

    // Create audit log entries
    if (productChanged) {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "PRODUCT_CHANGED",
          entityType: "VERIFIED_GEAR_ITEM",
          entityId: verifiedItem.id,
          details: JSON.stringify({
            oldProductId: existingVerifiedItem?.productId,
            newProductId: body.productId,
            itemName: pendingItem.name
          })
        }
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "INSPECTION_UPDATED",
        entityType: "VERIFIED_GEAR_ITEM",
        entityId: verifiedItem.id,
        details: JSON.stringify({
          condition: body.condition,
          itemName: pendingItem.name
        })
      }
    })

    return NextResponse.json({
      success: true,
      verifiedItemId: verifiedItem.id
    })

  } catch (error: any) {
    console.error("PUT /api/incoming-gear/items/[itemId]/inspection error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to save inspection data" 
    }, { status: 500 })
  }
}
