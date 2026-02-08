import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
      activateNow,
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
        buyPriceMin === undefined || buyPriceMax === undefined || consignPriceMin === undefined || consignPriceMax === undefined) {
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

    const wantsActive = activateNow === undefined ? true : !!activateNow

    // Lens activation guard: a lens may be saved as DRAFT (inactive), but cannot be activated without required specs
    let active = wantsActive
    let draftReason: string | null = null
    let missingLensFields: string[] = []

    if (String(productType).toUpperCase() === "LENS") {
      const specsObj = safeJsonParse(specifications) || {}
      missingLensFields = getLensRequiredMissingFromSpecs(specsObj)

      if (wantsActive && missingLensFields.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot activate lens product: missing required lens specs",
            missing: missingLensFields,
          },
          { status: 400 }
        )
      }

      if (!wantsActive) {
        active = false
        if (missingLensFields.length > 0) {
          draftReason = "Saved as DRAFT: missing required lens specs for activation"
        }
      }
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
        active
      }
    })

    return NextResponse.json({
      success: true,
      product,
      ...(draftReason ? { draft: true, draftReason, missing: missingLensFields } : {})
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
