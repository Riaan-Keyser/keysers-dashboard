import { sendTestEmail, sendQuoteConfirmationEmail, sendAwaitingPaymentEmail, sendQuoteDeclinedEmail } from "../lib/email"

async function testAllEmails() {
  console.log("🧪 Testing All Email Templates")
  console.log("================================\n")
  
  const testEmail = process.argv[2] || "admin@keysers.co.za"
  
  console.log(`📤 Sending test emails to: ${testEmail}\n`)
  
  // Test 1: Basic Test Email
  console.log("📝 Test 1: Basic Test Email")
  const test1 = await sendTestEmail(testEmail)
  if (test1.success) {
    console.log("✅ Test email sent successfully!")
  } else {
    console.error("❌ Failed:", test1.error)
  }
  console.log("")
  
  // Test 2: Quote Confirmation Email
  console.log("📝 Test 2: Quote Confirmation Email")
  const test2 = await sendQuoteConfirmationEmail({
    customerName: "Test Customer",
    customerEmail: testEmail,
    token: "test-token-123456789abcdef",
    items: [
      {
        id: "item1",
        pendingPurchaseId: "purchase1",
        name: "Canon EOS R5 Camera Body",
        brand: "Canon",
        model: "EOS R5",
        category: "CAMERA_BODY",
        condition: "EXCELLENT",
        description: "Excellent condition, low shutter count",
        serialNumber: "123456",
        botEstimatedPrice: 35000,
        proposedPrice: 32000,
        finalPrice: 32000,
        suggestedSellPrice: 45000,
        status: "APPROVED",
        reviewNotes: null,
        imageUrls: [],
        equipmentId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "item2",
        pendingPurchaseId: "purchase1",
        name: "Canon RF 24-70mm f/2.8L IS USM",
        brand: "Canon",
        model: "RF 24-70mm f/2.8L",
        category: "LENS",
        condition: "GOOD",
        description: "Some cosmetic wear",
        serialNumber: "789012",
        botEstimatedPrice: 18000,
        proposedPrice: 16000,
        finalPrice: 16000,
        suggestedSellPrice: 22000,
        status: "APPROVED",
        reviewNotes: null,
        imageUrls: [],
        equipmentId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    totalAmount: 48000
  })
  if (test2.success) {
    console.log("✅ Quote email sent successfully!")
  } else {
    console.error("❌ Failed:", test2.error)
  }
  console.log("")
  
  // Test 3: Awaiting Payment Notification
  console.log("📝 Test 3: Awaiting Payment Notification (Admin)")
  const test3 = await sendAwaitingPaymentEmail({
    customerName: "John Smith",
    customerEmail: "john.smith@example.com",
    totalAmount: 48000,
    purchaseId: "test-purchase-123",
    adminEmail: testEmail
  })
  if (test3.success) {
    console.log("✅ Payment notification sent successfully!")
  } else {
    console.error("❌ Failed:", test3.error)
  }
  console.log("")
  
  // Test 4: Quote Declined Notification
  console.log("📝 Test 4: Quote Declined Notification (Admin)")
  const test4 = await sendQuoteDeclinedEmail({
    customerName: "Jane Doe",
    customerEmail: "jane.doe@example.com",
    reason: "Found a better offer elsewhere",
    adminEmail: testEmail
  })
  if (test4.success) {
    console.log("✅ Decline notification sent successfully!")
  } else {
    console.error("❌ Failed:", test4.error)
  }
  console.log("")
  
  // Summary
  console.log("================================")
  console.log("📊 Summary")
  console.log("================================")
  console.log("")
  console.log("Test 1 (Basic):", test1.success ? "✅ Pass" : "❌ Fail")
  console.log("Test 2 (Quote):", test2.success ? "✅ Pass" : "❌ Fail")
  console.log("Test 3 (Payment):", test3.success ? "✅ Pass" : "❌ Fail")
  console.log("Test 4 (Declined):", test4.success ? "✅ Pass" : "❌ Fail")
  console.log("")
  
  const allPassed = test1.success && test2.success && test3.success && test4.success
  
  if (allPassed) {
    console.log("🎉 All email tests passed!")
    console.log("📬 Check your inbox for 4 test emails")
  } else {
    console.log("⚠️  Some tests failed. Check the errors above.")
    console.log("")
    console.log("💡 Common issues:")
    console.log("   • RESEND_API_KEY not set in .env.local")
    console.log("   • FROM_EMAIL domain not verified in Resend")
    console.log("   • API key invalid or expired")
  }
  console.log("")
}

testAllEmails().catch(console.error)
