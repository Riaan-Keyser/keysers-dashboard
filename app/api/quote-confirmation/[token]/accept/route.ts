import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"

export async function POST(
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

    if ((purchase as any).alreadyResponded) {
      return NextResponse.json({
        error: "Quote already responded to"
      }, { status: 400 })
    }

    // Update purchase status to CLIENT_ACCEPTED
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        clientAcceptedAt: new Date(),
        status: "CLIENT_ACCEPTED"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Quote accepted. Please complete your details.",
      nextStep: "provide-details"
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/accept error:", error)
    return NextResponse.json({ 
      error: "Failed to accept quote" 
    }, { status: 500 })
  }
}
