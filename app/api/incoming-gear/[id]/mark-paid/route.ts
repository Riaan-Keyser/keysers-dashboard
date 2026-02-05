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

    // Update purchase status to PAYMENT_RECEIVED
    const purchase = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        status: "PAYMENT_RECEIVED"
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "MARKED_AS_PAID",
        entityType: "PENDING_PURCHASE",
        entityId: purchase.id,
        details: JSON.stringify({
          customerName: purchase.customerName,
          previousStatus: "AWAITING_PAYMENT"
        })
      }
    })

    console.log(`✅ Purchase ${id} marked as paid by ${session.user.name}`)

    return NextResponse.json({
      success: true,
      message: "Purchase marked as paid"
    })

  } catch (error: any) {
    console.error("Error marking purchase as paid:", error)
    return NextResponse.json({
      error: "Failed to mark as paid",
      details: error.message
    }, { status: 500 })
  }
}
