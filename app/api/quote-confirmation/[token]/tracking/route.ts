import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateQuoteToken } from "@/lib/token"

/**
 * Submit tracking information for shipped gear
 * Public endpoint (no auth required, token-based)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Validate token and get purchase
    const purchase = await validateQuoteToken(token)
    
    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired tracking link" 
      }, { status: 400 })
    }

    // Check if already responded
    if ((purchase as any).alreadyResponded) {
      return NextResponse.json({ 
        error: "You have already submitted tracking information or this quote has been processed" 
      }, { status: 400 })
    }

    const body = await request.json()
    const { courierCompany, trackingNumber } = body

    // Validate required fields
    if (!courierCompany || !trackingNumber) {
      return NextResponse.json({ 
        error: "Courier company and tracking number are required" 
      }, { status: 400 })
    }

    // Update purchase with tracking info
    const updated = await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        courierCompany: courierCompany.trim(),
        trackingNumber: trackingNumber.trim(),
        status: "AWAITING_DELIVERY"
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: "system", // No user session for public endpoint
        action: "TRACKING_SUBMITTED",
        entityType: "PENDING_PURCHASE",
        entityId: purchase.id,
        details: JSON.stringify({
          courierCompany: courierCompany.trim(),
          trackingNumber: trackingNumber.trim(),
          customerName: purchase.customerName
        })
      }
    })

    console.log(`✅ Tracking info submitted for ${purchase.customerName}: ${courierCompany} - ${trackingNumber}`)

    return NextResponse.json({
      success: true,
      message: "Tracking information received! We'll notify you when your gear arrives."
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/tracking error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to submit tracking information" 
    }, { status: 500 })
  }
}
