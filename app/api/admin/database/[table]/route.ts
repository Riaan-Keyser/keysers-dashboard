import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Allowed tables for security
const ALLOWED_TABLES = [
  'users', 'vendors', 'equipment', 'repair_logs', 
  'price_history', 'activity_logs', 'woo_settings'
]

// Get rows from a specific table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const { table } = await params

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Table not allowed" }, { status: 403 })
    }

    // Get columns info
    const columns = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = '${table}' AND table_schema = 'public'
      ORDER BY ordinal_position
    `)

    // Get data with limit
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    const data = await prisma.$queryRawUnsafe(`
      SELECT * FROM "${table}" 
      ORDER BY "createdAt" DESC NULLS LAST, "id" DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(*) as count FROM "${table}"
    `)
    const total = Number(countResult[0].count)

    return NextResponse.json({
      columns: columns.map(c => ({ name: c.column_name, type: c.data_type })),
      data,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error("GET /api/admin/database/[table] error:", error)
    return NextResponse.json({ error: "Failed to fetch table data" }, { status: 500 })
  }
}

// Update a row in a table
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const { table } = await params

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Table not allowed" }, { status: 403 })
    }

    const { id, field, value } = await request.json()

    if (!id || !field) {
      return NextResponse.json({ error: "Missing id or field" }, { status: 400 })
    }

    // Sanitize field name (only allow alphanumeric and underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      return NextResponse.json({ error: "Invalid field name" }, { status: 400 })
    }

    // Update the specific field
    await prisma.$executeRawUnsafe(`
      UPDATE "${table}" SET "${field}" = $1 WHERE "id" = $2
    `, value, id)

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DATABASE_EDIT",
        entityType: table.toUpperCase(),
        entityId: id,
        details: JSON.stringify({ field, value })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/admin/database/[table] error:", error)
    return NextResponse.json({ error: "Failed to update row" }, { status: 500 })
  }
}

// Delete a row from a table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const { table } = await params

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Table not allowed" }, { status: 403 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id" = $1`, id)

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DATABASE_DELETE",
        entityType: table.toUpperCase(),
        entityId: id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/database/[table] error:", error)
    return NextResponse.json({ error: "Failed to delete row" }, { status: 500 })
  }
}
