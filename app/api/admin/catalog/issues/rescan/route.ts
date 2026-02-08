import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { scanCatalogBlockingIssues } from "@/lib/catalog-blocking-issues"

// POST /api/admin/catalog/issues/rescan
function isValidCronKey(provided: string | null): boolean {
  if (!provided) return false
  const expected = process.env.ADMIN_CRON_KEY
  if (!expected || expected.length < 32) return false
  return provided === expected
}

export async function POST(request: NextRequest) {
  // Auth method #1: header key for cron/CLI automation
  const cronKey = request.headers.get("x-admin-cron-key")
  if (!isValidCronKey(cronKey)) {
    // Auth method #2: NextAuth session ADMIN
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }
  }

  const summary = await scanCatalogBlockingIssues()
  return NextResponse.json(summary)
}

