import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listClientsWithCounts } from "@/lib/client-management"

// GET /api/clients - List all clients with counts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clients = await listClientsWithCounts()

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Failed to fetch clients:", error)
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    )
  }
}
