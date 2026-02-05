import { prisma } from "../lib/prisma"

/**
 * Reset a quote submission for testing
 * This allows re-testing the submission flow
 */
async function resetQuote() {
  const purchaseId = "cml95fjc60000v5i1p3hzx3yg"
  
  console.log("🔄 Resetting quote for testing...")
  
  // Delete client details
  await prisma.clientDetails.deleteMany({
    where: { pendingPurchaseId: purchaseId }
  })
  
  // Reset purchase status back to FINAL_QUOTE_SENT
  await prisma.pendingPurchase.update({
    where: { id: purchaseId },
    data: {
      status: "FINAL_QUOTE_SENT",
      clientAcceptedAt: null
    }
  })
  
  // Get inspection session and clear client selections
  const purchase = await prisma.pendingPurchase.findUnique({
    where: { id: purchaseId },
    include: { inspectionSession: true }
  })
  
  if (purchase?.inspectionSessionId) {
    await prisma.incomingGearItem.updateMany({
      where: {
        sessionId: purchase.inspectionSessionId
      },
      data: {
        clientSelection: null
      }
    })
  }
  
  console.log("✅ Reset complete! You can now test the submission flow again.")
  console.log("📋 Use this link:")
  console.log("   http://localhost:3000/quote/c2b0f5ef7e118fc69eab33d718e97e4e033f809afee1cf9cd1882f3f949cbff5/select-products")
  
  await prisma.$disconnect()
}

resetQuote().catch(console.error)
