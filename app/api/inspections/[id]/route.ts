import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// GET /api/inspections/[id] - Get specific inspection session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const inspectionSession = await prisma.inspectionSession.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        incomingItems: {
          include: {
            verifiedItem: {
              include: {
                product: true,
                answers: true,
                accessories: true,
                pricingSnapshot: true,
                priceOverride: {
                  include: {
                    overriddenBy: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                },
                verifiedBy: {
                  select: { id: true, name: true, email: true }
                },
                approvedBy: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!inspectionSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ session: inspectionSession }, { status: 200 })
  } catch (error: any) {
    console.error("GET /api/inspections/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch session" }, { status: 500 })
  }
}

// PATCH /api/inspections/[id] - Update inspection session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { sessionName, shipmentReference, vendorId, notes, status: sessionStatus } = body

    const updated = await prisma.inspectionSession.update({
      where: { id },
      data: {
        sessionName,
        shipmentReference,
        vendorId,
        notes,
        status: sessionStatus,
        completedAt: sessionStatus === "COMPLETED" ? new Date() : undefined
      },
      include: {
        vendor: true,
        incomingItems: {
          include: {
            verifiedItem: true
          }
        }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED_INSPECTION_SESSION",
        entityType: "INSPECTION_SESSION",
        entityId: id,
        details: JSON.stringify({ changes: body })
      }
    })

    return NextResponse.json({ session: updated }, { status: 200 })
  } catch (error: any) {
    console.error("PATCH /api/inspections/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update session" }, { status: 500 })
  }
}

// DELETE /api/inspections/[id] - Delete inspection session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const { id } = await params

    await prisma.inspectionSession.delete({
      where: { id }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETED_INSPECTION_SESSION",
        entityType: "INSPECTION_SESSION",
        entityId: id,
        details: JSON.stringify({ deletedAt: new Date() })
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("DELETE /api/inspections/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete session" }, { status: 500 })
  }
}
