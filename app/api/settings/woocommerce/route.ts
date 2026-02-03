import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, "MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.wooSettings.findFirst()
    
    return NextResponse.json(settings || null)
  } catch (error) {
    console.error("GET /api/settings/woocommerce error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, "MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Check if settings exist
    const existing = await prisma.wooSettings.findFirst()

    let settings
    if (existing) {
      settings = await prisma.wooSettings.update({
        where: { id: existing.id },
        data: body
      })
    } else {
      settings = await prisma.wooSettings.create({
        data: body
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED_WOOCOMMERCE_SETTINGS",
        entityType: "SETTINGS",
        entityId: settings.id
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("POST /api/settings/woocommerce error:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
