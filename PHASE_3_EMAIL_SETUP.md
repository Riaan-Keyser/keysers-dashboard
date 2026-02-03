# Phase 3: Email System Setup

**Duration:** 1-2 hours  
**Status:** 🔴 Not Started  
**Dependencies:** None (can be done in parallel with Phase 2)

---

## 🎯 Objectives

1. Choose and set up email service (Resend recommended)
2. Create email templates
3. Build email utility functions
4. Test email delivery
5. Handle email errors gracefully

---

## 📧 Email Service Setup

### Recommended: Resend

**Why Resend?**
- Modern, developer-friendly API
- 100 emails/day on free tier (3,000/month)
- Excellent deliverability
- React Email component support
- Simple setup with Next.js

### Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address
4. Get your API key from dashboard

### Step 2: Add Environment Variable

Add to `.env.local`:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_123456789_your_actual_key_here

# Email Configuration
FROM_EMAIL=noreply@keysers.co.za
ADMIN_EMAIL=admin@keysers.co.za
COMPANY_NAME=Keysers
COMPANY_WEBSITE=https://keysers.co.za
DASHBOARD_URL=https://yourdomain.com
```

Add to `.env.example`:

```bash
# Email Service
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=noreply@keysers.co.za
ADMIN_EMAIL=admin@keysers.co.za
COMPANY_NAME=Keysers
COMPANY_WEBSITE=https://keysers.co.za
DASHBOARD_URL=https://yourdomain.com
```

### Step 3: Install Resend Package

```bash
npm install resend
```

---

## 🛠️ Implementation

### Task 1: Email Configuration

**File:** `lib/email-config.ts` (NEW)

```typescript
export const emailConfig = {
  from: process.env.FROM_EMAIL || "noreply@keysers.co.za",
  adminEmail: process.env.ADMIN_EMAIL || "admin@keysers.co.za",
  companyName: process.env.COMPANY_NAME || "Keysers",
  companyWebsite: process.env.COMPANY_WEBSITE || "https://keysers.co.za",
  dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:3000",
}

export function getQuoteUrl(token: string): string {
  return `${emailConfig.dashboardUrl}/quote/${token}`
}

export function getAcceptUrl(token: string): string {
  return `${emailConfig.dashboardUrl}/quote/${token}/accept`
}

export function getDeclineUrl(token: string): string {
  return `${emailConfig.dashboardUrl}/quote/${token}/declined`
}

export function getDashboardPurchaseUrl(purchaseId: string): string {
  return `${emailConfig.dashboardUrl}/dashboard/awaiting-payment?id=${purchaseId}`
}
```

---

### Task 2: Email Utility Functions

**File:** `lib/email.ts` (NEW)

```typescript
import { Resend } from "resend"
import { emailConfig, getQuoteUrl, getAcceptUrl, getDeclineUrl, getDashboardPurchaseUrl } from "./email-config"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Send quote confirmation email to client
 */
export async function sendQuoteConfirmationEmail({
  customerName,
  customerEmail,
  token,
  items,
  totalAmount
}: {
  customerName: string
  customerEmail: string
  token: string
  items: any[]
  totalAmount: number | null
}) {
  try {
    const quoteUrl = getQuoteUrl(token)
    const acceptUrl = getAcceptUrl(token)
    const declineUrl = getDeclineUrl(token)

    const itemsList = items
      .map(item => `<li><strong>${item.name}</strong> - R${item.finalPrice?.toLocaleString() || "TBC"}</li>`)
      .join("\n")

    const total = totalAmount 
      ? `R${totalAmount.toLocaleString()}` 
      : items.reduce((sum, item) => sum + (item.finalPrice || 0), 0).toLocaleString()

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [customerEmail],
      subject: `Your Quote from ${emailConfig.companyName} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .items { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .total { font-size: 24px; font-weight: bold; color: #0066cc; margin: 20px 0; }
              .button { display: inline-block; padding: 15px 30px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .accept-btn { background-color: #28a745; color: white; }
              .decline-btn { background-color: #dc3545; color: white; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${emailConfig.companyName}</h1>
                <p>Your Quote is Ready</p>
              </div>
              
              <div class="content">
                <h2>Hi ${customerName},</h2>
                <p>Thank you for your interest in selling your gear to ${emailConfig.companyName}.</p>
                <p>We're pleased to offer you a quote for the following items:</p>
                
                <div class="items">
                  <ul>
                    ${itemsList}
                  </ul>
                </div>
                
                <p class="total">Total Offer: R${total}</p>
                
                <p>Please review your quote and let us know if you accept:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${acceptUrl}" class="button accept-btn">✓ Accept Quote</a>
                  <a href="${declineUrl}" class="button decline-btn">✗ Decline Quote</a>
                </div>
                
                <p style="font-size: 12px; color: #666;">
                  Or copy this link to your browser: <br>
                  <a href="${quoteUrl}">${quoteUrl}</a>
                </p>
                
                <p style="color: #999; font-size: 12px;">This link expires in 7 days.</p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                <p><a href="${emailConfig.companyWebsite}">${emailConfig.companyWebsite}</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send quote email:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Quote email sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending quote email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification to admin when payment is awaiting
 */
export async function sendAwaitingPaymentEmail({
  customerName,
  customerEmail,
  totalAmount,
  purchaseId,
  adminEmail
}: {
  customerName: string
  customerEmail: string
  totalAmount: number | null
  purchaseId: string
  adminEmail: string
}) {
  try {
    const dashboardUrl = getDashboardPurchaseUrl(purchaseId)
    const total = totalAmount ? `R${totalAmount.toLocaleString()}` : "TBC"

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} System <${emailConfig.from}>`,
      to: [adminEmail],
      subject: `Payment Awaiting - ${customerName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .alert { background-color: #fff3cd; border-left: 4px solid: #ffc107; padding: 15px; margin: 20px 0; }
              .info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .button { display: inline-block; padding: 15px 30px; margin: 20px 0; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔔 Payment Awaiting</h1>
              
              <div class="alert">
                <strong>A client has accepted their quote and submitted their details.</strong>
              </div>
              
              <div class="info">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Total Amount:</strong> ${total}</p>
                <p><strong>Purchase ID:</strong> ${purchaseId}</p>
              </div>
              
              <a href="${dashboardUrl}" class="button">View in Dashboard →</a>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                This is an automated notification from ${emailConfig.companyName} Dashboard.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send admin notification:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Admin notification sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending admin notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification to admin when quote is declined
 */
export async function sendQuoteDeclinedEmail({
  customerName,
  customerEmail,
  reason,
  adminEmail
}: {
  customerName: string
  customerEmail: string
  reason?: string
  adminEmail: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} System <${emailConfig.from}>`,
      to: [adminEmail],
      subject: `Quote Declined - ${customerName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Quote Declined</h1>
              
              <div class="info">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              </div>
              
              <p style="font-size: 12px; color: #666;">
                This is an automated notification from ${emailConfig.companyName} Dashboard.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send decline notification:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Decline notification sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending decline notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Test email configuration
 */
export async function sendTestEmail(toEmail: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [toEmail],
      subject: "Test Email from Keysers Dashboard",
      html: `
        <h1>Email System Test</h1>
        <p>If you're reading this, email configuration is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

## 🧪 Testing

### Test 1: Send Test Email

Create a test script:

**File:** `scripts/test-email.ts` (NEW)

```typescript
import { sendTestEmail } from "@/lib/email"

async function testEmail() {
  console.log("🧪 Testing email configuration...\n")
  
  const result = await sendTestEmail("your-email@example.com") // Change this!
  
  if (result.success) {
    console.log("✅ Email sent successfully!")
    console.log("Message ID:", result.messageId)
  } else {
    console.error("❌ Failed to send email:")
    console.error(result.error)
  }
}

testEmail()
```

Run the test:

```bash
npx tsx scripts/test-email.ts
```

### Test 2: Test Quote Email

```typescript
import { sendQuoteConfirmationEmail } from "@/lib/email"

async function testQuoteEmail() {
  const result = await sendQuoteConfirmationEmail({
    customerName: "Test Customer",
    customerEmail: "your-email@example.com",
    token: "test-token-123",
    items: [
      { name: "Canon EOS R5", finalPrice: 35000 },
      { name: "RF 24-70mm Lens", finalPrice: 18000 }
    ],
    totalAmount: 53000
  })
  
  console.log(result)
}

testQuoteEmail()
```

---

## ✅ Completion Checklist

- [ ] Created Resend account
- [ ] Added RESEND_API_KEY to .env.local
- [ ] Added email config to .env.example
- [ ] Installed resend package
- [ ] Created email-config.ts
- [ ] Created email.ts with all functions
- [ ] Created test scripts
- [ ] Sent test email successfully
- [ ] Verified email delivery
- [ ] Tested all email templates
- [ ] Committed changes to git

---

## 📝 Git Backup

```bash
git add lib/email.ts lib/email-config.ts scripts/test-email.ts .env.example
git commit -m "Phase 3 Complete: Email system setup with Resend"
git tag -a quote-workflow-phase-3-complete -m "Email system configured"
```

---

**Phase Status:** 🔴 Not Started  
**Next Phase:** `PHASE_4_PUBLIC_PAGES.md`
