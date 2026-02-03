import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating sample incoming gear...')

  // Create a sample pending purchase
  const purchase = await prisma.pendingPurchase.create({
    data: {
      customerName: "John Smith",
      customerPhone: "+27 82 555 1234",
      customerEmail: "john@example.com",
      whatsappConversationId: "test-conv-123",
      totalQuoteAmount: 85000,
      botQuoteAcceptedAt: new Date(),
      status: "PENDING_REVIEW",
      items: {
        create: [
          {
            name: "Canon EOS R6",
            brand: "Canon",
            model: "EOS R6",
            category: "CAMERA_BODY",
            condition: "EXCELLENT",
            description: "Barely used, includes original box",
            botEstimatedPrice: 35000,
            proposedPrice: 32000,
            suggestedSellPrice: 45000,
            status: "PENDING",
            imageUrls: []
          },
          {
            name: "Sony FE 24-70mm f/2.8 GM",
            brand: "Sony",
            model: "FE 24-70mm f/2.8 GM",
            category: "LENS",
            condition: "MINT",
            description: "Professional lens, mint condition",
            botEstimatedPrice: 28000,
            proposedPrice: 26000,
            suggestedSellPrice: 36000,
            status: "PENDING",
            imageUrls: []
          },
          {
            name: "DJI Ronin RS3",
            brand: "DJI",
            model: "Ronin RS3",
            category: "GIMBAL",
            condition: "GOOD",
            description: "Used gimbal, all accessories included",
            botEstimatedPrice: 12000,
            proposedPrice: 10500,
            suggestedSellPrice: 15000,
            status: "PENDING",
            imageUrls: []
          }
        ]
      }
    }
  })

  console.log('✅ Created pending purchase:', purchase.id)
  console.log('   Customer:', purchase.customerName)
  console.log('   Total Quote:', purchase.totalQuoteAmount)
  console.log('   Items: 3')
  console.log('')
  console.log('Go to Dashboard > Incoming Gear to review!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
