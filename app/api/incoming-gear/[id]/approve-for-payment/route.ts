import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, generateSupplierInvoiceEmail } from "@/lib/email-service"

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

    // Get the purchase with approved items
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: {
        items: {
          where: {
            status: { in: ["APPROVED", "PRICE_ADJUSTED"] }
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    if (purchase.items.length === 0) {
      return NextResponse.json({ error: "No approved items" }, { status: 400 })
    }

    // Calculate invoice total
    const invoiceTotal = purchase.items.reduce((sum, item) => {
      const price = item.finalPrice || item.proposedPrice || 0
      return sum + Number(price)
    }, 0)

    // Generate invoice number
    const invoiceCount = await prisma.pendingPurchase.count({
      where: { invoiceNumber: { not: null } }
    })
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

    // Generate unique accept token
    const acceptToken = `${id}-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Update purchase with invoice details
    await prisma.pendingPurchase.update({
      where: { id },
      data: {
        invoiceNumber,
        invoiceTotal,
        invoiceAcceptToken: acceptToken,
        invoiceEmailSentAt: new Date(),
        status: "APPROVED"  // Approved, awaiting client acceptance
      }
    })

    // Send email to client
    if (purchase.customerEmail) {
      const emailHtml = generateSupplierInvoiceEmail(
        purchase.customerName,
        invoiceNumber,
        purchase.items.map(item => ({
          name: item.name,
          finalPrice: item.finalPrice ? Number(item.finalPrice) : null,
          proposedPrice: item.proposedPrice ? Number(item.proposedPrice) : null
        })),
        invoiceTotal,
        acceptToken,
        process.env.NEXTAUTH_URL || 'http://localhost:3000'
      )

      await sendEmail({
        to: purchase.customerEmail,
        subject: `Supplier Invoice ${invoiceNumber} - Keysers Camera Equipment`,
        html: emailHtml
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SENT_SUPPLIER_INVOICE",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          invoiceNumber,
          customerName: purchase.customerName,
          total: invoiceTotal,
          itemCount: purchase.items.length
        })
      }
    })

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceTotal,
      message: "Supplier invoice generated and email sent to client"
    })
  } catch (error) {
    console.error("POST /api/incoming-gear/[id]/approve-for-payment error:", error)
    return NextResponse.json({ error: "Failed to approve for payment" }, { status: 500 })
  }
}
