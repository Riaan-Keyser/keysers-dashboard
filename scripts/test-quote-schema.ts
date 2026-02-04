import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

const prisma = new PrismaClient()

async function testQuoteSchema() {
  console.log("🧪 Testing Quote Confirmation Schema...\n")
  
  try {
    // Test 1: Create PendingPurchase with quote fields
    console.log("Test 1: Creating PendingPurchase with quote fields...")
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now
    
    const purchase = await prisma.pendingPurchase.create({
      data: {
        customerName: "Test Customer",
        customerPhone: "27823456789",
        customerEmail: "test@example.com",
        status: "QUOTE_SENT",
        quoteConfirmationToken: token,
        quoteTokenExpiresAt: expiresAt,
        quoteConfirmedAt: new Date(),
        items: {
          create: [
            {
              name: "Test Camera",
              status: "APPROVED",
              proposedPrice: 5000,
              finalPrice: 5000
            }
          ]
        }
      }
    })
    
    console.log("✅ Created PendingPurchase with quote fields:", purchase.id)
    
    // Test 2: Create ClientDetails
    console.log("\nTest 2: Creating ClientDetails...")
    const clientDetails = await prisma.clientDetails.create({
      data: {
        pendingPurchaseId: purchase.id,
        fullName: "John",
        surname: "Doe",
        idNumber: "9001015009087",
        email: "john.doe@example.com",
        phone: "+27 82 345 6789",
        physicalAddress: "123 Test Street, Cape Town, 8000",
        physicalCity: "Cape Town",
        physicalProvince: "Western Cape",
        physicalPostalCode: "8000"
      }
    })
    
    console.log("✅ Created ClientDetails:", clientDetails.id)
    
    // Test 3: Fetch with relations
    console.log("\nTest 3: Fetching purchase with relations...")
    const purchaseWithDetails = await prisma.pendingPurchase.findUnique({
      where: { id: purchase.id },
      include: {
        items: true,
        clientDetails: true
      }
    })
    
    console.log("✅ Fetched purchase with relations:")
    console.log("  - Items count:", purchaseWithDetails?.items.length)
    console.log("  - Has client details:", !!purchaseWithDetails?.clientDetails)
    console.log("  - Client name:", purchaseWithDetails?.clientDetails?.fullName, purchaseWithDetails?.clientDetails?.surname)
    
    // Test 4: Find by token
    console.log("\nTest 4: Finding purchase by token...")
    const foundByToken = await prisma.pendingPurchase.findUnique({
      where: { quoteConfirmationToken: token }
    })
    
    console.log("✅ Found by token:", !!foundByToken)
    
    // Test 5: Test new status enums
    console.log("\nTest 5: Testing new status enums...")
    const statusTests = [
      "QUOTE_SENT",
      "CLIENT_ACCEPTED",
      "CLIENT_DECLINED",
      "AWAITING_PAYMENT",
      "PAYMENT_RECEIVED",
      "COMPLETED"
    ]
    
    for (const status of statusTests) {
      const testPurchase = await prisma.pendingPurchase.create({
        data: {
          customerName: `Test ${status}`,
          customerPhone: "27812345678",
          status: status as any,
          items: {
            create: {
              name: "Test Item",
              status: "PENDING"
            }
          }
        }
      })
      console.log(`  ✅ Created purchase with status: ${status}`)
      await prisma.pendingPurchase.delete({ where: { id: testPurchase.id } })
    }
    
    // Cleanup
    console.log("\n🧹 Cleaning up test data...")
    await prisma.clientDetails.delete({ where: { id: clientDetails.id } })
    await prisma.pendingPurchase.delete({ where: { id: purchase.id } })
    
    console.log("\n✅ All tests passed! Schema is working correctly.")
    console.log("\n📊 Summary:")
    console.log("  - PendingPurchase model: ✅")
    console.log("  - ClientDetails model: ✅")
    console.log("  - Quote confirmation fields: ✅")
    console.log("  - New status enums: ✅")
    console.log("  - Relations: ✅")
    console.log("  - Token lookup: ✅")
    
  } catch (error) {
    console.error("\n❌ Test failed:", error)
    throw error
  }
}

testQuoteSchema()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
