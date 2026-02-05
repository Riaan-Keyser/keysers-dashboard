import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createFreshPurchase() {
  console.log('🧪 Creating fresh test purchase for Incoming Gear...\n')

  const purchase = await prisma.pendingPurchase.create({
    data: {
      customerName: "Fresh Test Client",
      customerPhone: "+27 82 555 9999",
      customerEmail: "test@keysers.co.za",
      totalQuoteAmount: 15000,
      status: "PENDING_REVIEW", // This will show in Incoming Gear
      botQuoteAcceptedAt: new Date(),
      quoteConfirmationToken: `test-token-${Date.now()}`,
      quoteTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      items: {
        create: [
          {
            name: "Sony A7 III Camera Body",
            brand: "Sony",
            model: "A7 III",
            category: "CAMERA_BODY",
            condition: "EXCELLENT",
            description: "Great condition, low shutter count",
            botEstimatedPrice: 12000,
            proposedPrice: 12000,
            finalPrice: 12000,
            suggestedSellPrice: 15000,
            status: "PENDING",
            imageUrls: []
          },
          {
            name: "Sony FE 24-70mm f/2.8 GM",
            brand: "Sony",
            model: "FE 24-70mm f/2.8 GM",
            category: "LENS",
            condition: "GOOD",
            description: "Some wear but perfect glass",
            botEstimatedPrice: 18000,
            proposedPrice: 18000,
            finalPrice: 18000,
            suggestedSellPrice: 22000,
            status: "PENDING",
            imageUrls: []
          }
        ]
      }
    },
    include: {
      items: true
    }
  })

  console.log('✅ Purchase created successfully!\n')
  console.log(`   Customer: ${purchase.customerName}`)
  console.log(`   Status: ${purchase.status}`)
  console.log(`   Items: ${purchase.items.length}`)
  console.log(`   Total: R${Number(purchase.totalQuoteAmount).toLocaleString()}\n`)
  console.log('📋 Next steps:')
  console.log('   1. Refresh Incoming Gear page')
  console.log('   2. Set filter to "ALL" or "Pending Review"')
  console.log('   3. You should see "Fresh Test Client"')
  console.log('   4. Expand to see items')
  console.log('   5. Click "Mark as Received" (no tracking needed for in-person drop-off)')
}

createFreshPurchase()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
