import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listMessages, sendMessage } from "@/lib/kapso"

// GET - List messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const phoneNumberId = searchParams.get("phone_number_id")
    const conversationId = searchParams.get("conversation_id")

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "phone_number_id is required" },
        { status: 400 }
      )
    }

    const params = {
      conversationId: conversationId || undefined,
      direction: searchParams.get("direction") as "inbound" | "outbound" | undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100,
      after: searchParams.get("after") || undefined,
    }

    const messages = await listMessages(phoneNumberId, params)
    return NextResponse.json(messages)
  } catch (error: any) {
    console.error("GET /api/kapso/messages error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// POST - Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { phone_number_id, to, message } = body

    if (!phone_number_id || !to || !message) {
      return NextResponse.json(
        { error: "phone_number_id, to, and message are required" },
        { status: 400 }
      )
    }

    const result = await sendMessage(phone_number_id, to, message)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("POST /api/kapso/messages error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    )
  }
}
