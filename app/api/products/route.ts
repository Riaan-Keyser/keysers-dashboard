import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, ProductType } from "@prisma/client"

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
      buyPriceMin,
      buyPriceMax,
      consignPriceMin,
      consignPriceMax,
      description,
      specifications,
      imageUrl
    } = body

    // Validate required fields
    if (!name || !brand || !model || !productType || !buyPriceMin || !buyPriceMax || !consignPriceMin || !consignPriceMax) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
        active: true
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
