import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// GET /api/inspections - List all inspection sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const sessions = await prisma.inspectionSession.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        incomingItems: {
          include: {
            verifiedItem: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ sessions }, { status: 200 })
  } catch (error: any) {
    console.error("GET /api/inspections error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch sessions" }, { status: 500 })
  }
}

// POST /api/inspections - Create new inspection session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionName, shipmentReference, vendorId, notes, items } = body

    if (!sessionName) {
      return NextResponse.json({ error: "Session name is required" }, { status: 400 })
    }

    // Create session with incoming items
    const inspectionSession = await prisma.inspectionSession.create({
      data: {
        sessionName,
        shipmentReference,
        vendorId,
        notes,
        status: "IN_PROGRESS",
        createdById: session.user.id,
        incomingItems: {
          create: (items || []).map((item: any) => ({
            clientName: item.clientName,
            clientBrand: item.clientBrand,
            clientModel: item.clientModel,
            clientDescription: item.clientDescription,
            clientSerialNumber: item.clientSerialNumber,
            clientCondition: item.clientCondition,
            clientImages: item.clientImages || [],
            inspectionStatus: "UNVERIFIED"
          }))
        }
      },
      include: {
        incomingItems: true,
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_INSPECTION_SESSION",
        entityType: "INSPECTION_SESSION",
        entityId: inspectionSession.id,
        details: JSON.stringify({ sessionName, itemCount: items?.length || 0 })
      }
    })

    return NextResponse.json({ session: inspectionSession }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/inspections error:", error)
    return NextResponse.json({ error: error.message || "Failed to create session" }, { status: 500 })
  }
}
