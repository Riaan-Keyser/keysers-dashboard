import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/consignment-review/[token] - Get change request by token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const changeRequest = await prisma.consignmentChangeRequest.findUnique({
      where: { clientConfirmationToken: params.token },
      include: {
        equipment: {
          select: {
            id: true,
            sku: true,
            name: true,
            brand: true,
            model: true,
            images: true,
          },
        },
      },
    })

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      )
    }

    if (changeRequest.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "This request has already been confirmed" },
        { status: 400 }
      )
    }

    if (changeRequest.status === "EXPIRED") {
      return NextResponse.json(
        { error: "This request has expired" },
        { status: 400 }
      )
    }

    // Serialize Decimal fields
    const serialized = {
      ...changeRequest,
      currentPayout: changeRequest.currentPayout ? Number(changeRequest.currentPayout) : null,
      proposedPayout: changeRequest.proposedPayout ? Number(changeRequest.proposedPayout) : null,
      clientAdjustedPayout: changeRequest.clientAdjustedPayout ? Number(changeRequest.clientAdjustedPayout) : null,
    }

    return NextResponse.json({
      changeRequest: serialized,
    })
  } catch (error) {
    console.error("Failed to fetch change request:", error)
    return NextResponse.json(
      { error: "Failed to fetch change request" },
      { status: 500 }
    )
  }
}
