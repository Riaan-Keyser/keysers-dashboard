import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"
import { sendQuoteApprovedEmail } from "@/lib/email"

/**
 * Webhook endpoint for Kapso bot to call when a customer accepts a quote
 * 
 * This creates a new pending purchase in the "Incoming Gear" section
 * where staff can review, adjust prices, and approve items.
 * 
 * POST /api/webhooks/quote-accepted
 * 
 * Headers:
 *   x-api-key: Your dashboard API key (set in env as DASHBOARD_API_KEY)
 * 
 * Body:
 *   {
 *     customerName: string
 *     customerPhone: string
 *     customerEmail?: string
 *     whatsappConversationId?: string
 *     totalQuoteAmount?: number
 *     botQuoteAcceptedAt?: string (ISO date)
 *     items: Array<{
 *       name: string
 *       brand?: string
 *       model?: string
 *       category?: string
 *       condition?: string
 *       description?: string
 *       serialNumber?: string
 *       botEstimatedPrice?: number
 *       proposedPrice?: number
 *       suggestedSellPrice?: number
 *       imageUrls?: string[]
 *     }>
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key")
    
    if (!apiKey || apiKey !== process.env.DASHBOARD_API_KEY) {
      console.error("Webhook unauthorized: Invalid or missing API key")
      return NextResponse.json(
        { error: "Unauthorized - Invalid API key" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.customerName || !body.customerPhone) {
      return NextResponse.json(
        { error: "customerName and customerPhone are required" },
        { status: 400 }
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      )
    }

    // Generate tracking token for client
    const trackingToken = generateConfirmationToken()
    const tokenExpiry = getTokenExpiry()

    // Create pending purchase with items
    const pendingPurchase = await prisma.pendingPurchase.create({
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        whatsappConversationId: body.whatsappConversationId || null,
        totalQuoteAmount: body.totalQuoteAmount || null,
        botQuoteAcceptedAt: body.botQuoteAcceptedAt ? new Date(body.botQuoteAcceptedAt) : new Date(),
        botConversationData: body.botConversationData ? JSON.stringify(body.botConversationData) : null,
        status: "PENDING_REVIEW",
        quoteConfirmationToken: trackingToken,
        quoteTokenExpiresAt: tokenExpiry,
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
            suggestedSellPrice: item.suggestedSellPrice || null,
            imageUrls: item.imageUrls || [],
            status: "PENDING"
          }))
        }
      },
      include: {
        items: true
      }
    })

    console.log(`✅ Quote accepted webhook: Created pending purchase ${pendingPurchase.id} for ${body.customerName} with ${body.items.length} items`)

    // Send quote approved email with delivery options link
    if (body.customerEmail) {
      const emailResult = await sendQuoteApprovedEmail({
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        token: trackingToken,
        totalAmount: body.totalQuoteAmount
      })

      if (emailResult.success) {
        console.log(`✅ Quote approved email sent to ${body.customerEmail}`)
      } else {
        console.warn(`⚠️ Failed to send quote approved email: ${emailResult.error}`)
      }
    } else {
      console.log(`ℹ️ No email provided, skipping quote approved email`)
    }

    return NextResponse.json(
      {
        success: true,
        purchaseId: pendingPurchase.id,
        message: "Quote submitted for review",
        itemCount: pendingPurchase.items.length
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/webhooks/quote-accepted error:", error)
    return NextResponse.json(
      {
        error: "Failed to process quote acceptance",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "quote-accepted webhook",
    method: "POST",
    requiredHeaders: ["x-api-key"],
    requiredFields: ["customerName", "customerPhone", "items"]
  })
}
