import { PrismaClient, ProductType } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔧 Adding accessory templates to products...")

  // Get all products by type
  const lenses = await prisma.product.findMany({
    where: { productType: ProductType.LENS }
  })

  const cameraBodies = await prisma.product.findMany({
    where: { productType: ProductType.CAMERA_BODY }
  })

  const tripods = await prisma.product.findMany({
    where: { productType: ProductType.TRIPOD }
  })

  console.log(`\nFound ${lenses.length} lenses, ${cameraBodies.length} camera bodies, ${tripods.length} tripods`)

  // LENS Accessories
  const lensAccessories = [
    { name: "Original Front Lens Cap", order: 1, required: false, penalty: 50 },
    { name: "Original Rear Lens Cap", order: 2, required: false, penalty: 50 },
    { name: "Original Lens Hood", order: 3, required: false, penalty: 200 },
    { name: "Original Tripod Collar Ring", order: 4, required: false, penalty: 500 },
    { name: "Original Drop-In Filter", order: 5, required: false, penalty: 300 },
    { name: "Original Hard Case", order: 6, required: false, penalty: 400 },
    { name: "Original Packaging", order: 7, required: false, penalty: 100 }
  ]

  console.log("\n📦 Adding LENS accessories...")
  for (const lens of lenses) {
    for (const acc of lensAccessories) {
      await prisma.accessoryTemplate.upsert({
        where: {
          productId_accessoryName: {
            productId: lens.id,
            accessoryName: acc.name
          }
        },
        update: {},
        create: {
          productId: lens.id,
          accessoryName: acc.name,
          accessoryOrder: acc.order,
          isRequired: acc.required,
          penaltyAmount: acc.penalty
        }
      })
    }
    console.log(`  ✅ ${lens.name}`)
  }

  // CAMERA_BODY Accessories
  const cameraAccessories = [
    { name: "Original Battery", order: 1, required: false, penalty: 800 },
    { name: "Original Charger", order: 2, required: false, penalty: 600 },
    { name: "Original Camera Strap", order: 3, required: false, penalty: 100 },
    { name: "Original Packaging", order: 4, required: false, penalty: 100 }
  ]

  console.log("\n📷 Adding CAMERA BODY accessories...")
  for (const camera of cameraBodies) {
    for (const acc of cameraAccessories) {
      await prisma.accessoryTemplate.upsert({
        where: {
          productId_accessoryName: {
            productId: camera.id,
            accessoryName: acc.name
          }
        },
        update: {},
        create: {
          productId: camera.id,
          accessoryName: acc.name,
          accessoryOrder: acc.order,
          isRequired: acc.required,
          penaltyAmount: acc.penalty
        }
      })
    }
    console.log(`  ✅ ${camera.name}`)
  }

  // TRIPOD Accessories
  const tripodAccessories = [
    { name: "Original Baseplate", order: 1, required: false, penalty: 300 }
  ]

  console.log("\n🦵 Adding TRIPOD accessories...")
  for (const tripod of tripods) {
    for (const acc of tripodAccessories) {
      await prisma.accessoryTemplate.upsert({
        where: {
          productId_accessoryName: {
            productId: tripod.id,
            accessoryName: acc.name
          }
        },
        update: {},
        create: {
          productId: tripod.id,
          accessoryName: acc.name,
          accessoryOrder: acc.order,
          isRequired: acc.required,
          penaltyAmount: acc.penalty
        }
      })
    }
    console.log(`  ✅ ${tripod.name}`)
  }

  console.log("\n🎉 Successfully added all accessory templates!")
  
  // Summary
  const totalAccessories = await prisma.accessoryTemplate.count()
  console.log(`\n📊 Total accessory templates in database: ${totalAccessories}`)
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
