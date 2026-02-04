# Phase 2: Backend API Endpoints

**Duration:** 2-3 hours  
**Status:** ✅ COMPLETE  
**Dependencies:** Phase 1 (Database Schema)

---

## 🎯 Objectives

1. Create "Send Quote" API endpoint
2. Implement token generation and validation utilities
3. Create quote confirmation GET endpoint (public)
4. Create accept/decline endpoints
5. Create submit details endpoint
6. Add proper error handling and validation

---

## 🛠️ Implementation Tasks

### Task 1: Token Generation Utility

**File:** `lib/token.ts` (NEW)

```typescript
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

/**
 * Generate a secure random token for quote confirmation
 */
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Generate token expiry date (7 days from now)
 */
export function getTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  return expiry
}

/**
 * Validate quote confirmation token
 * Returns purchase if valid, null if invalid/expired
 */
export async function validateQuoteToken(token: string) {
  if (!token) return null
  
  const purchase = await prisma.pendingPurchase.findUnique({
    where: { quoteConfirmationToken: token },
    include: {
      items: true,
      clientDetails: true
    }
  })
  
  if (!purchase) return null
  
  // Check if token is expired
  if (purchase.quoteTokenExpiresAt && purchase.quoteTokenExpiresAt < new Date()) {
    return null
  }
  
  // Check if already accepted/declined
  if (purchase.clientAcceptedAt || purchase.clientDeclinedAt) {
    return { ...purchase, alreadyResponded: true }
  }
  
  return purchase
}

/**
 * Invalidate token after use (one-time use)
 */
export async function invalidateToken(purchaseId: string) {
  await prisma.pendingPurchase.update({
    where: { id: purchaseId },
    data: { 
      quoteConfirmationToken: null,
      quoteTokenExpiresAt: null
    }
  })
}
```

---

### Task 2: Send Quote API Endpoint

**File:** `app/api/incoming-gear/[id]/send-quote/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"
import { sendQuoteConfirmationEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { customerEmail } = body // Allow email override

    // Fetch the purchase with items
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Validate purchase status
    if (purchase.status !== "APPROVED" && purchase.status !== "PENDING_REVIEW") {
      return NextResponse.json({ 
        error: "Purchase must be approved before sending quote" 
      }, { status: 400 })
    }

    // Check if quote already sent
    if (purchase.quoteConfirmationToken && purchase.quoteTokenExpiresAt && purchase.quoteTokenExpiresAt > new Date()) {
      return NextResponse.json({ 
        error: "Quote already sent and still valid",
        token: purchase.quoteConfirmationToken,
        expiresAt: purchase.quoteTokenExpiresAt
      }, { status: 400 })
    }

    // Use provided email or existing customer email
    const recipientEmail = customerEmail || purchase.customerEmail
    if (!recipientEmail) {
      return NextResponse.json({ 
        error: "Customer email is required" 
      }, { status: 400 })
    }

    // Generate token and expiry
    const token = generateConfirmationToken()
    const expiresAt = getTokenExpiry()

    // Update purchase with quote confirmation details
    const updatedPurchase = await prisma.pendingPurchase.update({
      where: { id },
      data: {
        quoteConfirmationToken: token,
        quoteTokenExpiresAt: expiresAt,
        quoteConfirmedAt: new Date(),
        customerEmail: recipientEmail, // Update email if changed
        status: "QUOTE_SENT"
      },
      include: { items: true }
    })

    // Send email to client
    const emailSent = await sendQuoteConfirmationEmail({
      customerName: purchase.customerName,
      customerEmail: recipientEmail,
      token,
      items: purchase.items,
      totalAmount: purchase.totalQuoteAmount
    })

    if (!emailSent.success) {
      // Rollback token if email fails
      await prisma.pendingPurchase.update({
        where: { id },
        data: {
          quoteConfirmationToken: null,
          quoteTokenExpiresAt: null,
          quoteConfirmedAt: null,
          status: purchase.status // Revert to previous status
        }
      })
      
      return NextResponse.json({ 
        error: "Failed to send email",
        details: emailSent.error
      }, { status: 500 })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "QUOTE_SENT",
        entityType: "PENDING_PURCHASE",
        entityId: id,
        details: JSON.stringify({ 
          email: recipientEmail,
          token: token.substring(0, 8) + "...", // Log partial token
          expiresAt
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: "Quote sent successfully",
      token,
      expiresAt,
      emailSent: emailSent.success
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/incoming-gear/[id]/send-quote error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to send quote" 
    }, { status: 500 })
  }
}
```

---

### Task 3: Get Quote Details (Public Endpoint)

**File:** `app/api/quote-confirmation/[token]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken } from "@/lib/token"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    // Check if already responded
    if (purchase.alreadyResponded) {
      return NextResponse.json({
        error: "Quote already responded to",
        accepted: !!purchase.clientAcceptedAt,
        declined: !!purchase.clientDeclinedAt
      }, { status: 400 })
    }

    // Return quote details (safe for public)
    return NextResponse.json({
      success: true,
      quote: {
        id: purchase.id,
        customerName: purchase.customerName,
        items: purchase.items.map(item => ({
          name: item.name,
          brand: item.brand,
          model: item.model,
          condition: item.condition,
          description: item.description,
          price: item.finalPrice,
          imageUrls: item.imageUrls
        })),
        totalAmount: purchase.totalQuoteAmount,
        createdAt: purchase.createdAt,
        expiresAt: purchase.quoteTokenExpiresAt
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("GET /api/quote-confirmation/[token] error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch quote" 
    }, { status: 500 })
  }
}
```

---

### Task 4: Accept Quote Endpoint

**File:** `app/api/quote-confirmation/[token]/accept/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    if (purchase.alreadyResponded) {
      return NextResponse.json({
        error: "Quote already responded to"
      }, { status: 400 })
    }

    // Update purchase status to CLIENT_ACCEPTED
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        clientAcceptedAt: new Date(),
        status: "CLIENT_ACCEPTED"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Quote accepted. Please complete your details.",
      nextStep: "provide-details"
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/accept error:", error)
    return NextResponse.json({ 
      error: "Failed to accept quote" 
    }, { status: 500 })
  }
}
```

---

### Task 5: Decline Quote Endpoint

**File:** `app/api/quote-confirmation/[token]/decline/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken, invalidateToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"
import { sendQuoteDeclinedEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { reason } = body // Optional decline reason

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    if (purchase.alreadyResponded) {
      return NextResponse.json({
        error: "Quote already responded to"
      }, { status: 400 })
    }

    // Update purchase status to CLIENT_DECLINED
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        clientDeclinedAt: new Date(),
        clientDeclineReason: reason || null,
        status: "CLIENT_DECLINED"
      }
    })

    // Invalidate token
    await invalidateToken(purchase.id)

    // Notify admin
    await sendQuoteDeclinedEmail({
      customerName: purchase.customerName,
      customerEmail: purchase.customerEmail || "Unknown",
      reason,
      adminEmail: "admin@keysers.co.za"
    })

    return NextResponse.json({
      success: true,
      message: "Thank you for your response. Your quote has been declined."
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/decline error:", error)
    return NextResponse.json({ 
      error: "Failed to decline quote" 
    }, { status: 500 })
  }
}
```

---

### Task 6: Submit Client Details Endpoint

**File:** `app/api/quote-confirmation/[token]/submit-details/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken, invalidateToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"
import { validateSAIdNumber } from "@/lib/validators"
import { sendAwaitingPaymentEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    // Check if client accepted quote
    if (!purchase.clientAcceptedAt) {
      return NextResponse.json({
        error: "Please accept the quote first"
      }, { status: 400 })
    }

    // Check if details already submitted
    if (purchase.clientDetails) {
      return NextResponse.json({
        error: "Details already submitted"
      }, { status: 400 })
    }

    // Validate required fields
    const requiredFields = ["fullName", "surname", "idNumber", "email", "phone", "physicalAddress"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Validate SA ID number
    if (!validateSAIdNumber(body.idNumber)) {
      return NextResponse.json({ 
        error: "Invalid South African ID number" 
      }, { status: 400 })
    }

    // Create client details
    const clientDetails = await prisma.clientDetails.create({
      data: {
        pendingPurchaseId: purchase.id,
        fullName: body.fullName,
        surname: body.surname,
        idNumber: body.idNumber,
        email: body.email,
        phone: body.phone,
        physicalAddress: body.physicalAddress,
        physicalStreet: body.physicalStreet,
        physicalCity: body.physicalCity,
        physicalProvince: body.physicalProvince,
        physicalPostalCode: body.physicalPostalCode,
        postalAddress: body.postalAddress,
        postalCity: body.postalCity,
        postalProvince: body.postalProvince,
        postalPostalCode: body.postalPostalCode,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountType: body.accountType,
        branchCode: body.branchCode,
        accountHolderName: body.accountHolderName,
        proofOfIdUrl: body.proofOfIdUrl, // URL from file upload
        proofOfAddressUrl: body.proofOfAddressUrl,
        bankConfirmationUrl: body.bankConfirmationUrl,
        ipAddress: request.headers.get("x-forwarded-for") || request.ip,
        userAgent: request.headers.get("user-agent")
      }
    })

    // Update purchase status to AWAITING_PAYMENT
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "AWAITING_PAYMENT"
      }
    })

    // Invalidate token (one-time use)
    await invalidateToken(purchase.id)

    // Send notification to admin
    await sendAwaitingPaymentEmail({
      customerName: `${body.fullName} ${body.surname}`,
      customerEmail: body.email,
      totalAmount: purchase.totalQuoteAmount,
      purchaseId: purchase.id,
      adminEmail: "admin@keysers.co.za"
    })

    return NextResponse.json({
      success: true,
      message: "Details submitted successfully. You will be contacted shortly regarding payment."
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/submit-details error:", error)
    return NextResponse.json({ 
      error: "Failed to submit details" 
    }, { status: 500 })
  }
}
```

---

## ✅ Completion Checklist

- [ ] Created `lib/token.ts` with token utilities
- [ ] Created send quote endpoint
- [ ] Created get quote details endpoint
- [ ] Created accept quote endpoint
- [ ] Created decline quote endpoint
- [ ] Created submit details endpoint
- [ ] Added proper error handling to all endpoints
- [ ] Added authentication checks where needed
- [ ] Added validation for all inputs
- [ ] Tested all endpoints with Postman/curl
- [ ] Committed changes to git

---

## 🧪 Testing

Test each endpoint with curl or Postman:

```bash
# 1. Send Quote (authenticated)
curl -X POST http://localhost:3000/api/incoming-gear/[id]/send-quote \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"customerEmail": "test@example.com"}'

# 2. Get Quote Details (public)
curl http://localhost:3000/api/quote-confirmation/[token]

# 3. Accept Quote (public)
curl -X POST http://localhost:3000/api/quote-confirmation/[token]/accept

# 4. Decline Quote (public)
curl -X POST http://localhost:3000/api/quote-confirmation/[token]/decline \
  -H "Content-Type: application/json" \
  -d '{"reason": "Price too low"}'

# 5. Submit Details (public)
curl -X POST http://localhost:3000/api/quote-confirmation/[token]/submit-details \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John",
    "surname": "Doe",
    "idNumber": "9001015009087",
    "email": "john@example.com",
    "phone": "+27823456789",
    "physicalAddress": "123 Test St, Cape Town"
  }'
```

---

## 📝 Git Backup

```bash
git add lib/token.ts app/api/incoming-gear app/api/quote-confirmation
git commit -m "Phase 2 Complete: Backend APIs for quote confirmation"
git tag -a quote-workflow-phase-2-complete -m "Backend APIs implemented"
```

---

**Phase Status:** 🔴 Not Started  
**Next Phase:** `PHASE_3_EMAIL_SETUP.md`
