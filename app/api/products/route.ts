import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, ProductType } from "@prisma/client"

function safeJsonParse(value: any): any | null {
  if (typeof value !== "string") return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function getLensRequiredMissingFromSpecs(specs: any): string[] {
  const missing: string[] = []
  const mount = specs?.mount
  const focalMin = specs?.focal_min_mm
  const apertureMin = specs?.aperture_min
  if (!isNonEmptyString(mount)) missing.push("specifications.mount")
  if (focalMin === null || focalMin === undefined || focalMin === "") missing.push("specifications.focal_min_mm")
  if (apertureMin === null || apertureMin === undefined || apertureMin === "") missing.push("specifications.aperture_min")
  return missing
}

// GET /api/products - Search/list products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const productType = searchParams.get("productType")
    const limit = parseInt(searchParams.get("limit") || "50")

    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { brand: { contains: search, mode: "insensitive" } },
                { model: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(productType ? { productType: productType as ProductType } : {})
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        variant: true,
        productType: true,
        buyPriceMin: true,
        buyPriceMax: true,
        consignPriceMin: true,
        consignPriceMax: true,
        description: true,
        imageUrl: true
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      take: limit
    })

    return NextResponse.json({ products }, { status: 200 })
  } catch (error: any) {
    console.error("GET /api/products error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 })
  }
}

// POST /api/products - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role, UserRole.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      brand,
      model,
      variant,
      productType,
      activateNow,
      buyPriceMin,
      buyPriceMax,
      consignPriceMin,
      consignPriceMax,
      description,
      specifications,
      imageUrl
    } = body

    // Validate required fields
    if (!name || !brand || !model || !productType || buyPriceMin === undefined || buyPriceMax === undefined || consignPriceMin === undefined || consignPriceMax === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const wantsActive = activateNow === undefined ? true : !!activateNow
    let active = wantsActive

    if (String(productType).toUpperCase() === "LENS") {
      const specsObj = safeJsonParse(specifications) || {}
      const missing = getLensRequiredMissingFromSpecs(specsObj)
      if (wantsActive && missing.length > 0) {
        return NextResponse.json(
          { error: "Cannot activate lens product: missing required lens specs", missing },
          { status: 400 }
        )
      }
      if (!wantsActive) {
        active = false
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        brand,
        model,
        variant,
        productType,
        buyPriceMin,
        buyPriceMax,
        consignPriceMin,
        consignPriceMax,
        description,
        specifications,
        imageUrl,
        active
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_PRODUCT",
        entityType: "PRODUCT",
        entityId: product.id,
        details: JSON.stringify({ name: product.name, brand, model })
      }
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/products error:", error)
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 })
  }
}
