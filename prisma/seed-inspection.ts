import { PrismaClient, ProductType, VerifiedCondition } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding inspection system data...")

  // ========================================
  // 1. Create Sample Products
  // ========================================
  
  console.log("📦 Creating sample products...")
  
  // Camera Bodies
  const canonR5 = await prisma.product.upsert({
    where: { brand_model_variant: { brand: "Canon", model: "EOS R5", variant: "Body Only" } },
    update: {},
    create: {
      name: "Canon EOS R5",
      brand: "Canon",
      model: "EOS R5",
      variant: "Body Only",
      productType: ProductType.CAMERA_BODY,
      buyPriceMin: 28000,
      buyPriceMax: 35000,
      consignPriceMin: 20000,
      consignPriceMax: 25000,
      description: "45MP full-frame mirrorless camera with 8K video",
      specifications: JSON.stringify({
        sensor: "45MP Full-Frame CMOS",
        video: "8K30p, 4K120p",
        iso: "100-51200",
        autofocus: "Dual Pixel CMOS AF II"
      }),
      active: true
    }
  })

  const sonyA7IV = await prisma.product.upsert({
    where: { brand_model_variant: { brand: "Sony", model: "A7 IV", variant: "Body Only" } },
    update: {},
    create: {
      name: "Sony A7 IV",
      brand: "Sony",
      model: "A7 IV",
      variant: "Body Only",
      productType: ProductType.CAMERA_BODY,
      buyPriceMin: 22000,
      buyPriceMax: 28000,
      consignPriceMin: 16000,
      consignPriceMax: 20000,
      description: "33MP full-frame mirrorless hybrid camera",
      specifications: JSON.stringify({
        sensor: "33MP Full-Frame CMOS",
        video: "4K60p 10-bit",
        iso: "100-51200",
        autofocus: "693-point Fast Hybrid AF"
      }),
      active: true
    }
  })

  // Lenses
  const canonRF2470 = await prisma.product.upsert({
    where: { brand_model_variant: { brand: "Canon", model: "RF 24-70mm f/2.8L IS USM", variant: "Standard" } },
    update: {},
    create: {
      name: "Canon RF 24-70mm f/2.8L IS USM",
      brand: "Canon",
      model: "RF 24-70mm f/2.8L IS USM",
      variant: "Standard",
      productType: ProductType.LENS,
      buyPriceMin: 18000,
      buyPriceMax: 24000,
      consignPriceMin: 13000,
      consignPriceMax: 17000,
      description: "Professional standard zoom lens with image stabilization",
      specifications: JSON.stringify({
        mount: "Canon RF",
        focalLength: "24-70mm",
        aperture: "f/2.8",
        stabilization: "5-stop IS"
      }),
      active: true
    }
  })

  const sony70200 = await prisma.product.upsert({
    where: { brand_model_variant: { brand: "Sony", model: "FE 70-200mm f/2.8 GM OSS II", variant: "Standard" } },
    update: {},
    create: {
      name: "Sony FE 70-200mm f/2.8 GM OSS II",
      brand: "Sony",
      model: "FE 70-200mm f/2.8 GM OSS II",
      variant: "Standard",
      productType: ProductType.LENS,
      buyPriceMin: 22000,
      buyPriceMax: 28000,
      consignPriceMin: 16000,
      consignPriceMax: 20000,
      description: "Professional telephoto zoom lens",
      specifications: JSON.stringify({
        mount: "Sony E",
        focalLength: "70-200mm",
        aperture: "f/2.8",
        stabilization: "OSS"
      }),
      active: true
    }
  })

  console.log("✅ Created 4 sample products")

  // ========================================
  // 2. Create Question Templates
  // ========================================
  
  console.log("❓ Creating question templates...")

  // Camera Body Questions
  await prisma.productQuestionTemplate.createMany({
    data: [
      {
        productId: canonR5.id,
        question: "Does the shutter fire correctly?",
        questionOrder: 1,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: canonR5.id,
        question: "Is the sensor clean and free of dust?",
        questionOrder: 2,
        isRequired: true,
        category: "Physical Condition"
      },
      {
        productId: canonR5.id,
        question: "Do all buttons and dials work properly?",
        questionOrder: 3,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: canonR5.id,
        question: "Is the LCD screen free of scratches?",
        questionOrder: 4,
        isRequired: false,
        category: "Physical Condition"
      },
      {
        productId: canonR5.id,
        question: "Does the viewfinder work correctly?",
        questionOrder: 5,
        isRequired: true,
        category: "Functionality"
      },
      // Sony A7 IV Questions
      {
        productId: sonyA7IV.id,
        question: "Does the shutter fire correctly?",
        questionOrder: 1,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: sonyA7IV.id,
        question: "Is the sensor clean and free of dust?",
        questionOrder: 2,
        isRequired: true,
        category: "Physical Condition"
      },
      {
        productId: sonyA7IV.id,
        question: "Do all menu functions work?",
        questionOrder: 3,
        isRequired: true,
        category: "Functionality"
      }
    ],
    skipDuplicates: true
  })

  // Lens Questions
  await prisma.productQuestionTemplate.createMany({
    data: [
      {
        productId: canonRF2470.id,
        question: "Is the glass free of scratches and fungus?",
        questionOrder: 1,
        isRequired: true,
        category: "Optical Condition"
      },
      {
        productId: canonRF2470.id,
        question: "Does the zoom ring operate smoothly?",
        questionOrder: 2,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: canonRF2470.id,
        question: "Does the focus ring work properly?",
        questionOrder: 3,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: canonRF2470.id,
        question: "Is the autofocus fast and accurate?",
        questionOrder: 4,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: canonRF2470.id,
        question: "Does the image stabilization work?",
        questionOrder: 5,
        isRequired: true,
        category: "Functionality"
      },
      // Sony Lens Questions
      {
        productId: sony70200.id,
        question: "Is the glass free of scratches and fungus?",
        questionOrder: 1,
        isRequired: true,
        category: "Optical Condition"
      },
      {
        productId: sony70200.id,
        question: "Does the zoom ring operate smoothly?",
        questionOrder: 2,
        isRequired: true,
        category: "Functionality"
      },
      {
        productId: sony70200.id,
        question: "Is the autofocus fast and accurate?",
        questionOrder: 3,
        isRequired: true,
        category: "Functionality"
      }
    ],
    skipDuplicates: true
  })

  console.log("✅ Created question templates")

  // ========================================
  // 3. Create Accessory Templates
  // ========================================
  
  console.log("📎 Creating accessory templates...")

  await prisma.accessoryTemplate.createMany({
    data: [
      // Canon R5 Accessories
      {
        productId: canonR5.id,
        accessoryName: "Battery Charger (LC-E6)",
        isRequired: true,
        penaltyAmount: 500
      },
      {
        productId: canonR5.id,
        accessoryName: "Battery (LP-E6NH)",
        isRequired: true,
        penaltyAmount: 800
      },
      {
        productId: canonR5.id,
        accessoryName: "Body Cap",
        isRequired: true,
        penaltyAmount: 100
      },
      {
        productId: canonR5.id,
        accessoryName: "USB-C Cable",
        isRequired: true,
        penaltyAmount: 200
      },
      {
        productId: canonR5.id,
        accessoryName: "Original Box",
        isRequired: false,
        penaltyAmount: 0
      },
      {
        productId: canonR5.id,
        accessoryName: "Strap",
        isRequired: false,
        penaltyAmount: 150
      },
      // Sony A7 IV Accessories
      {
        productId: sonyA7IV.id,
        accessoryName: "Battery Charger (BC-QZ1)",
        isRequired: true,
        penaltyAmount: 450
      },
      {
        productId: sonyA7IV.id,
        accessoryName: "Battery (NP-FZ100)",
        isRequired: true,
        penaltyAmount: 700
      },
      {
        productId: sonyA7IV.id,
        accessoryName: "Body Cap",
        isRequired: true,
        penaltyAmount: 100
      },
      {
        productId: sonyA7IV.id,
        accessoryName: "USB-C Cable",
        isRequired: true,
        penaltyAmount: 200
      },
      // Canon Lens Accessories
      {
        productId: canonRF2470.id,
        accessoryName: "Lens Hood (EW-88E)",
        isRequired: true,
        penaltyAmount: 300
      },
      {
        productId: canonRF2470.id,
        accessoryName: "Front Lens Cap",
        isRequired: true,
        penaltyAmount: 50
      },
      {
        productId: canonRF2470.id,
        accessoryName: "Rear Lens Cap",
        isRequired: true,
        penaltyAmount: 50
      },
      {
        productId: canonRF2470.id,
        accessoryName: "Lens Pouch",
        isRequired: false,
        penaltyAmount: 200
      },
      // Sony Lens Accessories
      {
        productId: sony70200.id,
        accessoryName: "Lens Hood (ALC-SH170)",
        isRequired: true,
        penaltyAmount: 400
      },
      {
        productId: sony70200.id,
        accessoryName: "Front Lens Cap",
        isRequired: true,
        penaltyAmount: 50
      },
      {
        productId: sony70200.id,
        accessoryName: "Rear Lens Cap",
        isRequired: true,
        penaltyAmount: 50
      }
    ],
    skipDuplicates: true
  })

  console.log("✅ Created accessory templates")

  // ========================================
  // 4. Create Known Issues
  // ========================================
  
  console.log("⚠️ Creating known issues...")

  await prisma.knownIssue.createMany({
    data: [
      {
        productId: canonR5.id,
        issueName: "Overheating in 8K mode",
        issueDescription: "Camera may overheat during extended 8K recording",
        autoInjectQuestion: true
      },
      {
        productId: canonR5.id,
        issueName: "Rubber grip peeling",
        issueDescription: "Rubber grip on right side may show signs of peeling",
        autoInjectQuestion: true
      },
      {
        productId: sonyA7IV.id,
        issueName: "Menu button wear",
        issueDescription: "Menu button may show excessive wear or become sticky",
        autoInjectQuestion: true
      },
      {
        productId: canonRF2470.id,
        issueName: "Focus breathing",
        issueDescription: "Lens may exhibit focus breathing during video recording",
        autoInjectQuestion: false
      }
    ],
    skipDuplicates: true
  })

  console.log("✅ Created known issues")

  console.log("\n🎉 Inspection system seed data complete!")
  console.log("\n📊 Summary:")
  console.log("   - 4 Products (2 Camera Bodies, 2 Lenses)")
  console.log("   - Question templates for each product")
  console.log("   - Accessory templates with penalties")
  console.log("   - Known issues for common problems")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
