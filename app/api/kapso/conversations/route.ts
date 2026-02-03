import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listConversations } from "@/lib/kapso"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const phoneNumberId = searchParams.get("phone_number_id")

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "phone_number_id is required" },
        { status: 400 }
      )
    }

    const params = {
      status: searchParams.get("status") as "active" | "ended" | undefined,
      lastActiveSince: searchParams.get("last_active_since") || undefined,
      lastActiveUntil: searchParams.get("last_active_until") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
      after: searchParams.get("after") || undefined,
    }

    const conversations = await listConversations(phoneNumberId, params)
    return NextResponse.json(conversations)
  } catch (error: any) {
    console.error("GET /api/kapso/conversations error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}
