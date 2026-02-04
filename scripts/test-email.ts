import { sendTestEmail } from "../lib/email"

async function testEmail() {
  console.log("🧪 Testing email configuration...\n")
  
  const testEmail = process.argv[2] || "admin@keysers.co.za"
  
  console.log(`📤 Sending test email to: ${testEmail}`)
  console.log("")
  
  const result = await sendTestEmail(testEmail)
  
  if (result.success) {
    console.log("✅ Email sent successfully!")
    console.log("📬 Message ID:", result.messageId)
    console.log("")
    console.log("📝 Check your inbox (and spam folder) for the test email.")
  } else {
    console.error("❌ Failed to send email:")
    console.error("   Error:", result.error)
    console.log("")
    console.log("💡 Troubleshooting:")
    console.log("   1. Check that RESEND_API_KEY is set in .env.local")
    console.log("   2. Verify your API key is valid at https://resend.com/api-keys")
    console.log("   3. Ensure FROM_EMAIL domain is verified in Resend")
  }
}

testEmail().catch(console.error)
