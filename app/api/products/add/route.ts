import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/products/add - Add new product (requires admin approval)
export async function POST(request: NextRequest) {
  try {
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
      imageUrl,
      adminId,
      adminPassword
    } = body

    // Verify required fields
    if (!name || !brand || !model || !productType || 
        !buyPriceMin || !buyPriceMax || !consignPriceMin || !consignPriceMax) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify admin credentials
    if (!adminId || !adminPassword) {
      return NextResponse.json(
        { error: "Admin approval required" },
        { status: 401 }
      )
    }

    const bcrypt = require("bcryptjs")
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(adminPassword, admin.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      )
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name,
        brand,
        model,
        variant: variant || null,
        productType,
        buyPriceMin: parseFloat(buyPriceMin),
        buyPriceMax: parseFloat(buyPriceMax),
        consignPriceMin: parseFloat(consignPriceMin),
        consignPriceMax: parseFloat(consignPriceMax),
        description: description || null,
        specifications: specifications || null,
        imageUrl: imageUrl || null,
        active: true
      }
    })

    return NextResponse.json({
      success: true,
      product
    }, { status: 201 })
  } catch (error: any) {
    console.error("Failed to add product:", error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A product with this name already exists" },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to add product" },
      { status: 500 }
    )
  }
}
