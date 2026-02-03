import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Fetch purchase details by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const purchase = await prisma.pendingPurchase.findUnique({
      where: { invoiceAcceptToken: token },
      include: {
        items: {
          where: {
            status: { in: ["APPROVED", "PRICE_ADJUSTED"] }
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
    }

    // Convert decimals
    const response = {
      ...purchase,
      invoiceTotal: purchase.invoiceTotal ? parseFloat(purchase.invoiceTotal.toString()) : null,
      items: purchase.items.map(item => ({
        ...item,
        finalPrice: item.finalPrice ? parseFloat(item.finalPrice.toString()) : null,
        proposedPrice: item.proposedPrice ? parseFloat(item.proposedPrice.toString()) : null
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("GET /api/client-details/[token] error:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

// POST - Submit client details
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    const purchase = await prisma.pendingPurchase.findUnique({
      where: { invoiceAcceptToken: token }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 })
    }

    // Update with client details
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        clientIdNumber: body.idNumber,
        clientAddress: body.address,
        clientCity: body.city,
        clientProvince: body.province,
        clientPostalCode: body.postalCode,
        clientBankName: body.bankName,
        clientAccountNumber: body.accountNumber,
        clientBranchCode: body.branchCode,
        clientAccountType: body.accountType,
        clientDetailsSubmitted: true,
        clientDetailsSubmittedAt: new Date(),
        status: "PENDING_APPROVAL"  // Ready for payment
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/client-details/[token] error:", error)
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 })
  }
}
