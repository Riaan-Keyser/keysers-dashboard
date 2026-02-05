import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/settings/accessories - Get all accessory templates grouped by product type
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productType = searchParams.get("productType")

    if (productType) {
      // Get accessories for specific product type
      const accessories = await prisma.accessoryTemplate.findMany({
        where: { productType },
        orderBy: { accessoryOrder: "asc" }
      })
      return NextResponse.json({ accessories })
    } else {
      // Get all accessories grouped by product type
      const accessories = await prisma.accessoryTemplate.findMany({
        orderBy: [{ productType: "asc" }, { accessoryOrder: "asc" }]
      })
      
      // Group by product type
      const grouped = accessories.reduce((acc, accessory) => {
        if (!acc[accessory.productType]) {
          acc[accessory.productType] = []
        }
        acc[accessory.productType].push(accessory)
        return acc
      }, {} as Record<string, typeof accessories>)
      
      return NextResponse.json({ accessories: grouped })
    }
  } catch (error) {
    console.error("Failed to fetch accessories:", error)
    return NextResponse.json({ error: "Failed to fetch accessories" }, { status: 500 })
  }
}

// POST /api/settings/accessories - Add new accessory template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, productType, accessoryName, penaltyAmount, accessoryOrder } = body

    if (!productType || !accessoryName) {
      return NextResponse.json(
        { error: "Product type and accessory name are required" },
        { status: 400 }
      )
    }

    const accessory = await prisma.accessoryTemplate.create({
      data: {
        productId,
        productType,
        accessoryName,
        penaltyAmount: penaltyAmount ? parseFloat(penaltyAmount) : null,
        accessoryOrder: accessoryOrder || 0
      }
    })

    return NextResponse.json({ accessory }, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create accessory:", error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "This accessory already exists for this product type" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create accessory" }, { status: 500 })
  }
}

// DELETE /api/settings/accessories?id=xxx - Delete accessory template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Accessory ID is required" }, { status: 400 })
    }

    await prisma.accessoryTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete accessory:", error)
    return NextResponse.json({ error: "Failed to delete accessory" }, { status: 500 })
  }
}
