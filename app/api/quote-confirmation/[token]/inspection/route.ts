import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/quote-confirmation/[token]/inspection
 * Fetch inspection session data with verified items and pricing
 * Used by client on /quote/[token]/select-products page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    // Check if inspection session exists
    if (!purchase.inspectionSessionId) {
      return NextResponse.json({ 
        error: "No inspection data found for this quote" 
      }, { status: 404 })
    }

    // Fetch full inspection session with verified items
    const inspectionSession = await prisma.inspectionSession.findUnique({
      where: { id: purchase.inspectionSessionId },
      include: {
        incomingItems: {
          include: {
            verifiedItem: {
              include: {
                product: true,
                pricingSnapshot: true,
                priceOverride: true,
                answers: true, // No question relation - questionText is stored directly
                accessories: true // No template relation needed for display
              }
            }
          }
        }
      }
    })

    if (!inspectionSession) {
      return NextResponse.json({ 
        error: "Inspection session not found" 
      }, { status: 404 })
    }

    // Map verified items with pricing
    const verifiedItems = inspectionSession.incomingItems
      .filter(item => item.verifiedItem && item.verifiedItem.approvedAt)
      .map(item => {
        const verified = item.verifiedItem!
        const pricing = verified.pricingSnapshot
        const override = verified.priceOverride

        // Use override prices if they exist, otherwise use snapshot
        const buyPrice = override?.overrideBuyPrice ?? pricing?.computedBuyPrice ?? 0
        const consignPrice = override?.overrideConsignPrice ?? pricing?.computedConsignPrice ?? 0

        return {
          id: item.id,
          verifiedItemId: verified.id,
          // Client submitted info
          clientName: item.clientName,
          clientDescription: item.clientDescription,
          clientImages: item.clientImages,
          // Verified info
          productName: verified.product?.name || item.clientName,
          productBrand: verified.product?.brand,
          productModel: verified.product?.model,
          verifiedCondition: verified.verifiedCondition,
          serialNumber: verified.serialNumber,
          generalNotes: verified.generalNotes,
          // Pricing
          buyPrice: Math.round(buyPrice),
          consignPrice: Math.round(consignPrice),
          // Images
          images: item.clientImages || [],
          // Details
          answers: verified.answers.map(ans => ({
            question: ans.questionText,
            answer: ans.answer,
            notes: ans.notes
          })),
          accessories: verified.accessories.map(acc => ({
            name: acc.accessoryName,
            isPresent: acc.isPresent,
            notes: acc.notes
          }))
        }
      })

    // Return data for client
    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        customerName: purchase.customerName,
        customerEmail: purchase.customerEmail,
        status: purchase.status
      },
      inspection: {
        sessionName: inspectionSession.sessionName,
        status: inspectionSession.status,
        notes: inspectionSession.notes,
        completedAt: inspectionSession.completedAt
      },
      items: verifiedItems,
      expiresAt: purchase.quoteTokenExpiresAt
    }, { status: 200 })

  } catch (error: any) {
    console.error("GET /api/quote-confirmation/[token]/inspection error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch inspection data" 
    }, { status: 500 })
  }
}
