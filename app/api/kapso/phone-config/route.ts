import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return the configured phone number ID from environment
    const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID || ""
    
    return NextResponse.json({ 
      phone_number_id: phoneNumberId,
      auto_connect: !!phoneNumberId
    })
  } catch (error: any) {
    console.error("GET /api/kapso/phone-config error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get phone config" },
      { status: 500 }
    )
  }
}
