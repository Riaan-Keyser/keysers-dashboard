import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendFinalQuoteEmail } from "@/lib/email"
import { emailConfig } from "@/lib/email-config"

/**
 * Send final quote email to client after inspection complete (Sprint 2)
 * Requires all items in inspection session to be APPROVED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get the purchase with inspection session
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: {
        items: true,
        inspectionSession: {
          include: {
            incomingItems: {
              include: {
                verifiedItem: true
              }
            }
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Validation
    if (!purchase.customerEmail) {
      return NextResponse.json({ 
        error: "Customer email is required to send final quote" 
      }, { status: 400 })
    }

    if (!purchase.inspectionSession) {
      return NextResponse.json({ 
        error: "No inspection session found for this purchase" 
      }, { status: 400 })
    }

    if (purchase.status === "FINAL_QUOTE_SENT") {
      return NextResponse.json({ 
        error: "Final quote has already been sent",
        sentAt: purchase.finalQuoteSentAt
      }, { status: 400 })
    }

    // Check if all items are approved (using approvedAt timestamp for accuracy)
    const incomingItems = purchase.inspectionSession.incomingItems
    const approvedItems = incomingItems.filter(item => 
      item.verifiedItem && item.verifiedItem.approvedAt !== null
    )

    if (approvedItems.length === 0) {
      return NextResponse.json({ 
        error: "No items have been approved yet. Please complete the inspection first." 
      }, { status: 400 })
    }

    if (approvedItems.length < incomingItems.length) {
      return NextResponse.json({ 
        error: `Only ${approvedItems.length} of ${incomingItems.length} items have been approved. Please approve or reject all items before sending final quote.` 
      }, { status: 400 })
    }

    // Use existing token or generate new one
    const quoteToken = purchase.quoteConfirmationToken

    if (!quoteToken) {
      return NextResponse.json({ 
        error: "No quote token found. This should not happen. Please contact support." 
      }, { status: 500 })
    }

    // Send final quote email
    const emailResult = await sendFinalQuoteEmail({
      customerName: purchase.customerName,
      customerEmail: purchase.customerEmail,
      token: quoteToken,
      itemCount: approvedItems.length,
      inspectionNotes: purchase.inspectionSession.notes || undefined
    })

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: `Failed to send email: ${emailResult.error}` 
      }, { status: 500 })
    }

    // Update purchase status
    await prisma.pendingPurchase.update({
      where: { id },
      data: {
        status: "FINAL_QUOTE_SENT",
        finalQuoteSentAt: new Date()
      }
    })

    // Update inspection session status
    await prisma.inspectionSession.update({
      where: { id: purchase.inspectionSession.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date()
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "FINAL_QUOTE_SENT",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          customerEmail: purchase.customerEmail,
          itemCount: approvedItems.length,
          inspectionSessionId: purchase.inspectionSession.id
        })
      }
    })

    console.log(`✅ Final quote sent to ${purchase.customerEmail} by ${session.user.name}`)

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: "Final quote sent successfully",
      sentTo: purchase.customerEmail,
      itemCount: approvedItems.length,
      quoteUrl: `${emailConfig.dashboardUrl}/quote/${quoteToken}/select-products`
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/send-final-quote error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to send final quote" 
    }, { status: 500 })
  }
}
