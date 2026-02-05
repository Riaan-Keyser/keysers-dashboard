import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")

    const where: any = {}
    if (status && status !== "ALL") {
      where.status = status
    } else if (status === "ALL") {
      // Exclude payment-related statuses from "ALL" - they appear on the awaiting payment page
      where.status = {
        notIn: ["AWAITING_PAYMENT", "PAYMENT_RECEIVED"]
      }
    }

    const pendingPurchases = await prisma.pendingPurchase.findMany({
      where,
      include: {
        vendor: true,
        items: true,
        clientDetails: true, // Include client details for AWAITING_PAYMENT status
        reviewedBy: {
          select: { id: true, name: true }
        },
        approvedBy: {
          select: { id: true, name: true }
        },
        gearReceivedBy: {
          select: { id: true, name: true }
        },
        inspectionSession: {
          include: {
            createdBy: {
              select: { id: true, name: true }
            },
            incomingItems: {
              include: {
                verifiedItem: {
                  select: {
                    locked: true,
                    approvedAt: true,
                    verifiedAt: true,
                    pricingSnapshot: {
                      select: {
                        finalBuyPrice: true,
                        finalConsignPrice: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Convert Decimal fields and map inspection items
    const serialized = pendingPurchases.map(purchase => {
      // For payment-related statuses, use inspection session items
      let items = purchase.items
      const useInspectionItems = ["AWAITING_PAYMENT", "PAYMENT_RECEIVED", "COMPLETED"].includes(purchase.status)
      
      if (useInspectionItems && purchase.inspectionSession?.incomingItems) {
        items = purchase.inspectionSession.incomingItems.map(incomingItem => {
          const buyPrice = incomingItem.verifiedItem?.pricingSnapshot?.finalBuyPrice 
            ? parseFloat(incomingItem.verifiedItem.pricingSnapshot.finalBuyPrice.toString())
            : null
          const consignPrice = incomingItem.verifiedItem?.pricingSnapshot?.finalConsignPrice
            ? parseFloat(incomingItem.verifiedItem.pricingSnapshot.finalConsignPrice.toString())
            : null
          
          // Final price depends on what client selected
          let finalPrice = null
          if (incomingItem.clientSelection === "BUY") {
            finalPrice = buyPrice
          } else if (incomingItem.clientSelection === "CONSIGNMENT") {
            finalPrice = consignPrice
          } else {
            finalPrice = buyPrice || consignPrice // fallback
          }

          return {
            id: incomingItem.id,
            name: incomingItem.clientName,
            brand: incomingItem.clientBrand,
            model: incomingItem.clientModel,
            category: null,
            condition: incomingItem.clientCondition,
            finalPrice,
            clientSelection: incomingItem.clientSelection, // "BUY" or "CONSIGNMENT"
            buyPrice,
            consignPrice,
            status: purchase.status, // Use actual purchase status
            description: null,
            serialNumber: null,
            botEstimatedPrice: null,
            proposedPrice: null,
            suggestedSellPrice: null,
            images: incomingItem.clientImages || []
          }
        }) as any
      } else {
        items = purchase.items.map(item => ({
          ...item,
          botEstimatedPrice: item.botEstimatedPrice ? parseFloat(item.botEstimatedPrice.toString()) : null,
          proposedPrice: item.proposedPrice ? parseFloat(item.proposedPrice.toString()) : null,
          finalPrice: item.finalPrice ? parseFloat(item.finalPrice.toString()) : null,
          suggestedSellPrice: item.suggestedSellPrice ? parseFloat(item.suggestedSellPrice.toString()) : null,
          clientSelection: null
        }))
      }

      return {
        ...purchase,
        totalQuoteAmount: purchase.totalQuoteAmount ? parseFloat(purchase.totalQuoteAmount.toString()) : null,
        items
      }
    })

    return NextResponse.json(serialized)
  } catch (error) {
    console.error("GET /api/incoming-gear error:", error)
    return NextResponse.json({ error: "Failed to fetch incoming gear" }, { status: 500 })
  }
}

// Create new pending purchase (called by WhatsApp bot)
export async function POST(request: NextRequest) {
  try {
    // Allow both session auth and API key auth (for bot integration)
    const apiKey = request.headers.get("x-api-key")
    const session = await getServerSession(authOptions)
    
    if (!session && apiKey !== process.env.DASHBOARD_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const userId = session?.user?.id || "system"  // Use "system" for bot-created entries

    const pendingPurchase = await prisma.pendingPurchase.create({
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        whatsappConversationId: body.whatsappConversationId || null,
        totalQuoteAmount: body.totalQuoteAmount || null,
        botQuoteAcceptedAt: body.botQuoteAcceptedAt ? new Date(body.botQuoteAcceptedAt) : null,
        botConversationData: body.botConversationData ? JSON.stringify(body.botConversationData) : null,
        vendorId: body.vendorId || null,
        items: {
          create: body.items.map((item: any) => ({
            name: item.name,
            brand: item.brand || null,
            model: item.model || null,
            category: item.category || null,
            condition: item.condition || null,
            description: item.description || null,
            serialNumber: item.serialNumber || null,
            botEstimatedPrice: item.botEstimatedPrice || null,
            proposedPrice: item.proposedPrice || item.botEstimatedPrice || null,
            imageUrls: item.imageUrls || []
          }))
        }
      },
      include: {
        items: true
      }
    })

    // Log activity (only if we have a session)
    if (session) {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "CREATED_PENDING_PURCHASE",
          entityType: "PENDING_PURCHASE",
          entityId: pendingPurchase.id,
          details: JSON.stringify({
            customerName: body.customerName,
            itemCount: body.items.length,
            source: "whatsapp_bot"
          })
        }
      })
    }

    return NextResponse.json(pendingPurchase, { status: 201 })
  } catch (error) {
    console.error("POST /api/incoming-gear error:", error)
    return NextResponse.json({ error: "Failed to create pending purchase" }, { status: 500 })
  }
}
