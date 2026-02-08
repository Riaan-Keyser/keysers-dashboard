import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTables, getTableColumns, getTableData, updateCell, deleteRow } from "@/lib/inventory-db"

// GET - Fetch tables or table data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    // Check if inventory DB credentials are configured
    if (!process.env.INVENTORY_DB_PASSWORD && !process.env.DB_PASSWORD) {
      return NextResponse.json({ 
        error: "Inventory database credentials not configured. Please set INVENTORY_DB_PASSWORD in your .env file." 
      }, { status: 503 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")
    const table = searchParams.get("table")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (action === "tables") {
      const tables = await getTables()
      return NextResponse.json({ tables })
    }

    if (action === "columns" && table) {
      const columns = await getTableColumns(table)
      return NextResponse.json({ columns })
    }

    if (action === "data" && table) {
      const columns = await getTableColumns(table)
      const { rows, total } = await getTableData(table, limit, offset)
      return NextResponse.json({ columns, rows, total })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("GET /api/admin/inventory-db error:", error)
    
    // Provide helpful error messages for common issues
    if (error.message?.includes('SASL') || error.message?.includes('password')) {
      return NextResponse.json({ 
        error: "Database authentication failed. Please check INVENTORY_DB_PASSWORD in your .env file." 
      }, { status: 500 })
    }
    
    if (error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json({ 
        error: "Cannot connect to inventory database. Please ensure PostgreSQL is running and INVENTORY_DB_HOST/PORT are correct." 
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}

// PUT - Update a cell
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const { table, id, column, value } = await request.json()

    if (!table || !id || !column) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await updateCell(table, id, column, value)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("PUT /api/admin/inventory-db error:", error)
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}

// DELETE - Delete a row
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const { table, id } = await request.json()

    if (!table || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await deleteRow(table, id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /api/admin/inventory-db error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 })
  }
}
