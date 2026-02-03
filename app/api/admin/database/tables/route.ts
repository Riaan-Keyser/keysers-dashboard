import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get list of all tables
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    // Get all table names from the database
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `

    return NextResponse.json(tables.map(t => t.tablename))
  } catch (error) {
    console.error("GET /api/admin/database/tables error:", error)
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 })
  }
}
