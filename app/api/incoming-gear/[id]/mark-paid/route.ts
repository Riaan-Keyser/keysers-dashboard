import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const { paymentAmount, paymentMethod } = await request.json()

    // Get the pending purchase
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Update purchase status to paid
    await prisma.pendingPurchase.update({
      where: { id },
      data: {
        status: "ADDED_TO_INVENTORY",
        notes: `Payment received: R${paymentAmount} via ${paymentMethod}`
      }
    })

    // Update all items to show they're in inventory
    await prisma.pendingItem.updateMany({
      where: {
        pendingPurchaseId: id,
        status: "APPROVED"
      },
      data: {
        status: "ADDED_TO_INVENTORY"
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PAYMENT_RECEIVED",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          amount: paymentAmount,
          method: paymentMethod
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/incoming-gear/[id]/mark-paid error:", error)
    return NextResponse.json({ error: "Failed to mark as paid" }, { status: 500 })
  }
}
