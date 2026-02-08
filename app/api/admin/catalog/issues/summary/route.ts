import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCatalogIssuesSummary } from "@/lib/catalog-blocking-issues"

// GET /api/admin/catalog/issues/summary
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
  }

  const summary = await getCatalogIssuesSummary()
  return NextResponse.json(summary)
}

