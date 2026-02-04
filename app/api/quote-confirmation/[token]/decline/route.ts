import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken, invalidateToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"
import { sendQuoteDeclinedEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { reason } = body // Optional decline reason

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    if ((purchase as any).alreadyResponded) {
      return NextResponse.json({
        error: "Quote already responded to"
      }, { status: 400 })
    }

    // Update purchase status to CLIENT_DECLINED
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        clientDeclinedAt: new Date(),
        clientDeclineReason: reason || null,
        status: "CLIENT_DECLINED"
      }
    })

    // Invalidate token
    await invalidateToken(purchase.id)

    // Notify admin
    await sendQuoteDeclinedEmail({
      customerName: purchase.customerName,
      customerEmail: purchase.customerEmail || "Unknown",
      reason,
      adminEmail: "admin@keysers.co.za"
    })

    return NextResponse.json({
      success: true,
      message: "Thank you for your response. Your quote has been declined."
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/decline error:", error)
    return NextResponse.json({ 
      error: "Failed to decline quote" 
    }, { status: 500 })
  }
}
