import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getClientWithHistory } from "@/lib/client-management"

// GET /api/clients/[id] - Get client with equipment history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await getClientWithHistory(params.id)

    // Serialize Decimal fields in equipment
    const serialized = {
      ...client,
      equipment: client.equipment.map(e => ({
        ...e,
        sellingPrice: Number(e.sellingPrice),
        purchasePrice: e.purchasePrice ? Number(e.purchasePrice) : null,
        costPrice: e.costPrice ? Number(e.costPrice) : null,
        consignmentRate: e.consignmentRate ? Number(e.consignmentRate) : null,
      })),
    }

    return NextResponse.json(serialized)
  } catch (error: any) {
    console.error("Failed to fetch client:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch client" },
      { status: 500 }
    )
  }
}
