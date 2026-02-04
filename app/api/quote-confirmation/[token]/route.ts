import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken } from "@/lib/token"

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

    // Check if already responded
    if ((purchase as any).alreadyResponded) {
      return NextResponse.json({
        error: "Quote already responded to",
        accepted: !!purchase.clientAcceptedAt,
        declined: !!purchase.clientDeclinedAt
      }, { status: 400 })
    }

    // Return quote details (safe for public)
    return NextResponse.json({
      success: true,
      quote: {
        id: purchase.id,
        customerName: purchase.customerName,
        items: purchase.items.map(item => ({
          name: item.name,
          brand: item.brand,
          model: item.model,
          condition: item.condition,
          description: item.description,
          price: item.finalPrice,
          imageUrls: item.imageUrls
        })),
        totalAmount: purchase.totalQuoteAmount,
        createdAt: purchase.createdAt,
        expiresAt: purchase.quoteTokenExpiresAt
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("GET /api/quote-confirmation/[token] error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch quote" 
    }, { status: 500 })
  }
}
