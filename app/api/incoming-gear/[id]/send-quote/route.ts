import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"
import { sendQuoteConfirmationEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { customerEmail } = body // Allow email override

    // Fetch the purchase with items
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Validate purchase status
    if (purchase.status !== "APPROVED" && purchase.status !== "PENDING_REVIEW") {
      return NextResponse.json({ 
        error: "Purchase must be approved before sending quote" 
      }, { status: 400 })
    }

    // Check if quote already sent
    if (purchase.quoteConfirmationToken && purchase.quoteTokenExpiresAt && purchase.quoteTokenExpiresAt > new Date()) {
      return NextResponse.json({ 
        error: "Quote already sent and still valid",
        token: purchase.quoteConfirmationToken,
        expiresAt: purchase.quoteTokenExpiresAt
      }, { status: 400 })
    }

    // Use provided email or existing customer email
    const recipientEmail = customerEmail || purchase.customerEmail
    if (!recipientEmail) {
      return NextResponse.json({ 
        error: "Customer email is required" 
      }, { status: 400 })
    }

    // Generate token and expiry
    const token = generateConfirmationToken()
    const expiresAt = getTokenExpiry()

    // Update purchase with quote confirmation details
    const updatedPurchase = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        quoteConfirmationToken: token,
        quoteTokenExpiresAt: expiresAt,
        quoteConfirmedAt: new Date(),
        customerEmail: recipientEmail, // Update email if changed
        status: "QUOTE_SENT"
      },
      include: { items: true }
    })

    // Send email to client
    const emailSent = await sendQuoteConfirmationEmail({
      customerName: purchase.customerName,
      customerEmail: recipientEmail,
      token,
      items: purchase.items,
      totalAmount: purchase.totalQuoteAmount
    })

    if (!emailSent.success) {
      // Rollback token if email fails
      await prisma.pendingPurchase.update({
        where: { id },
        data: {
          quoteConfirmationToken: null,
          quoteTokenExpiresAt: null,
          quoteConfirmedAt: null,
          status: purchase.status // Revert to previous status
        }
      })
      
      return NextResponse.json({ 
        error: "Failed to send email",
        details: emailSent.error
      }, { status: 500 })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "QUOTE_SENT",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({ 
          email: recipientEmail,
          token: token.substring(0, 8) + "...", // Log partial token
          expiresAt
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: "Quote sent successfully",
      token,
      expiresAt,
      emailSent: emailSent.success
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/send-quote error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to send quote" 
    }, { status: 500 })
  }
}
