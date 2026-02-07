import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createEquipmentFromInspection } from "@/lib/equipment-conversion"

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

    // Get purchase with inspection session to check for items requiring repair
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: {
        inspectionSession: {
          include: {
            items: {
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

    // Count items requiring repair
    const itemsRequiringRepair = purchase.inspectionSession?.items.filter(
      item => item.verifiedItem?.requiresRepair
    ).length || 0

    // Create Equipment records from verified items (BUY items only - consignment handled in submit-details)
    let createdEquipment: any[] = []
    if (purchase.inspectionSession) {
      // Filter to only create equipment for BUY items
      const buyItems = purchase.inspectionSession.items.filter(
        item => item.verifiedItem && (item.clientSelection === "BUY" || !item.clientSelection)
      )
      
      if (buyItems.length > 0) {
        try {
          createdEquipment = await createEquipmentFromInspection(purchase.id, session.user.id)
          console.log(`✅ Created ${createdEquipment.length} equipment records`)
        } catch (error) {
          console.error("Failed to create equipment records:", error)
          // Don't fail the entire operation if equipment creation fails
        }
      }
    }

    // Update purchase status to PAYMENT_RECEIVED
    await prisma.pendingPurchase.update({
      where: { id },
      data: {
        status: "PAYMENT_RECEIVED",
        paymentReceivedAt: new Date(),
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
          previousStatus: "AWAITING_PAYMENT",
          itemsRequiringRepair,
          equipmentCreated: createdEquipment.length,
        })
      }
    })

    console.log(`✅ Purchase ${id} marked as paid by ${session.user.name}`)
    console.log(`   📦 Created ${createdEquipment.length} equipment record(s) in Uploading Stock`)
    if (itemsRequiringRepair > 0) {
      console.log(`   ⚠️  ${itemsRequiringRepair} item(s) requiring repair now available in Repairs tab`)
    }

    return NextResponse.json({
      success: true,
      message: "Purchase marked as paid",
      itemsRequiringRepair,
      equipmentCreated: createdEquipment.length,
    })

  } catch (error: any) {
    console.error("Error marking purchase as paid:", error)
    return NextResponse.json({
      error: "Failed to mark as paid",
      details: error.message
    }, { status: 500 })
  }
}
