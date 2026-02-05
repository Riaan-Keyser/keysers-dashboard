import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get regular repair logs
    const repairs = await prisma.repairLog.findMany({
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
            sku: true
          }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { sentAt: "desc" }
    })

    // Get items requiring repair from paid purchases
    const itemsRequiringRepair = await prisma.incomingGearItem.findMany({
      where: {
        verifiedItem: {
          requiresRepair: true
        },
        session: {
          purchase: {
            status: "PAYMENT_RECEIVED"
          }
        }
      },
      include: {
        verifiedItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true
              }
            }
          }
        },
        session: {
          include: {
            purchase: {
              select: {
                id: true,
                customerName: true
              }
            },
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      repairs,
      itemsRequiringRepair
    })
  } catch (error) {
    console.error("GET /api/repairs error:", error)
    return NextResponse.json({ error: "Failed to fetch repairs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Create repair log
    const repair = await prisma.repairLog.create({
      data: {
        ...body,
        createdById: session.user.id
      }
    })

    // Update equipment status
    await prisma.equipment.update({
      where: { id: body.equipmentId },
      data: {
        inRepair: true,
        status: "IN_REPAIR"
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SENT_TO_REPAIR",
        entityType: "EQUIPMENT",
        entityId: body.equipmentId,
        details: JSON.stringify({
          technicianName: body.technicianName,
          issue: body.issue
        })
      }
    })

    return NextResponse.json(repair, { status: 201 })
  } catch (error) {
    console.error("POST /api/repairs error:", error)
    return NextResponse.json({ error: "Failed to create repair log" }, { status: 500 })
  }
}
