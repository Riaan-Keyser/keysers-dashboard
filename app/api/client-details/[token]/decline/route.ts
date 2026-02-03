import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const purchase = await prisma.pendingPurchase.findUnique({
      where: { invoiceAcceptToken: token }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 })
    }

    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "REJECTED",
        rejectedReason: "Client declined supplier invoice"
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/client-details/[token]/decline error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
