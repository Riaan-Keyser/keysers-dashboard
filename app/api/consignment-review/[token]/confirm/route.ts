import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/consignment-review/[token]/confirm - Client confirms change request
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json()
    const { acceptAsIs, adjustedPayout } = body

    const changeRequest = await prisma.consignmentChangeRequest.findUnique({
      where: { clientConfirmationToken: params.token },
      include: {
        equipment: true,
      },
    })

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      )
    }

    if (changeRequest.status !== "PENDING_CLIENT") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      )
    }

    // Validate adjusted payout if provided
    if (!acceptAsIs && adjustedPayout) {
      if (changeRequest.proposedPayout && adjustedPayout > Number(changeRequest.proposedPayout)) {
        return NextResponse.json(
          { error: "Adjusted payout cannot exceed proposed payout" },
          { status: 400 }
        )
      }
    }

    // Update change request
    const updatedRequest = await prisma.consignmentChangeRequest.update({
      where: { id: changeRequest.id },
      data: {
        status: "CONFIRMED",
        clientConfirmedAt: new Date(),
        clientAdjustedPayout: acceptAsIs ? null : (adjustedPayout ? parseFloat(adjustedPayout) : null),
      },
    })

    // Apply changes to equipment
    const finalPayout = acceptAsIs 
      ? changeRequest.proposedPayout 
      : (adjustedPayout ? parseFloat(adjustedPayout) : changeRequest.proposedPayout)

    const updateData: any = {}
    if (finalPayout) {
      updateData.purchasePrice = finalPayout
      updateData.costPrice = finalPayout
    }
    // TODO: Add consignment end date field to Equipment model and update here

    if (Object.keys(updateData).length > 0) {
      await prisma.equipment.update({
        where: { id: changeRequest.equipmentId },
        data: updateData,
      })
    }

    console.log(`✅ Client confirmed consignment change for equipment ${changeRequest.equipment.sku}`)

    return NextResponse.json({
      success: true,
      message: "Confirmation received",
    })
  } catch (error) {
    console.error("Failed to confirm change request:", error)
    return NextResponse.json(
      { error: "Failed to confirm change request" },
      { status: 500 }
    )
  }
}
