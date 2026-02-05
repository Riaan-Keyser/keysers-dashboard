import { PrismaClient, ProductType } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Adding test products to database...")

  // 1. Nikon Series E 50mm 1:1.8 (LENS)
  const nikonLens = await prisma.product.upsert({
    where: {
      brand_model_variant: {
        brand: "Nikon",
        model: "Series E 50mm 1:1.8",
        variant: ""
      }
    },
    update: {},
    create: {
      name: "Nikon Series E 50mm f/1.8",
      brand: "Nikon",
      model: "Series E 50mm 1:1.8",
      variant: "",
      productType: ProductType.LENS,
      buyPriceMin: 800.00,
      buyPriceMax: 1500.00,
      consignPriceMin: 1200.00,
      consignPriceMax: 2000.00,
      description: "Classic Nikon Series E prime lens with excellent optical quality",
      active: true
    }
  })
  console.log("✅ Created:", nikonLens.name)

  // 2. Nikon D850 (CAMERA_BODY)
  const nikonBody = await prisma.product.upsert({
    where: {
      brand_model_variant: {
        brand: "Nikon",
        model: "D850",
        variant: ""
      }
    },
    update: {},
    create: {
      name: "Nikon D850",
      brand: "Nikon",
      model: "D850",
      variant: "",
      productType: ProductType.CAMERA_BODY,
      buyPriceMin: 18000.00,
      buyPriceMax: 25000.00,
      consignPriceMin: 22000.00,
      consignPriceMax: 30000.00,
      description: "Professional full-frame DSLR with 45.7MP sensor",
      active: true
    }
  })
  console.log("✅ Created:", nikonBody.name)

  // 3. Canon 24-70mm Ultrasonic (LENS)
  const canonLens = await prisma.product.upsert({
    where: {
      brand_model_variant: {
        brand: "Canon",
        model: "24-70mm Ultrasonic",
        variant: ""
      }
    },
    update: {},
    create: {
      name: "Canon EF 24-70mm f/2.8L USM",
      brand: "Canon",
      model: "24-70mm Ultrasonic",
      variant: "",
      productType: ProductType.LENS,
      buyPriceMin: 8000.00,
      buyPriceMax: 12000.00,
      consignPriceMin: 10000.00,
      consignPriceMax: 15000.00,
      description: "Professional standard zoom lens with ultrasonic motor",
      active: true
    }
  })
  console.log("✅ Created:", canonLens.name)

  console.log("\n🎉 Successfully added 3 test products!")
  console.log("\nProducts in database:")
  const allProducts = await prisma.product.findMany({
    orderBy: { brand: "asc" }
  })
  allProducts.forEach((p) => {
    console.log(`  - ${p.name} (${p.productType})`)
  })
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
