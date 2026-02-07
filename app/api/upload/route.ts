import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "equipment")
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

// POST /api/upload - Upload equipment images
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const equipmentId = formData.get("equipmentId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!equipmentId) {
      return NextResponse.json({ error: "Equipment ID required" }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WebP are allowed" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Create equipment-specific directory if it doesn't exist
    const equipmentDir = path.join(UPLOAD_DIR, equipmentId)
    if (!existsSync(equipmentDir)) {
      await mkdir(equipmentDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = path.extname(file.name)
    const filename = `${timestamp}${extension}`
    const filepath = path.join(equipmentDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return URL path (relative to public directory)
    const urlPath = `/uploads/equipment/${equipmentId}/${filename}`

    console.log(`✅ Image uploaded: ${urlPath}`)

    return NextResponse.json({
      success: true,
      url: urlPath,
      filename,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
