# Phase 1: Database Schema Updates

**Duration:** 2-3 hours  
**Status:** ✅ COMPLETE  
**Dependencies:** None

---

## 🎯 Objectives

1. Update `PendingPurchase` model with quote confirmation fields
2. Create new `ClientDetails` model for storing client information
3. Add new status enums for quote workflow
4. Run Prisma migrations
5. Test database changes

---

## 📊 Database Schema Changes

### 1. Update `PendingPurchase` Model

Add the following fields to track quote confirmation workflow:

```prisma
model PendingPurchase {
  id                      String        @id @default(cuid())
  customerName            String
  customerPhone           String
  customerEmail           String?
  whatsappConversationId  String?
  totalQuoteAmount        Float?
  status                  PurchaseStatus @default(PENDING_REVIEW)
  
  // Bot acceptance tracking (existing)
  botQuoteAcceptedAt      DateTime?
  
  // NEW: Quote confirmation tracking
  quoteConfirmedAt        DateTime?     // When admin sent quote to client
  quoteConfirmationToken  String?       @unique // Unique token for email link
  quoteTokenExpiresAt     DateTime?     // Token expiry (7 days default)
  
  // NEW: Client response tracking
  clientAcceptedAt        DateTime?     // When client accepted quote
  clientDeclinedAt        DateTime?     // When client declined quote
  clientDeclineReason     String?       // Optional reason for decline
  
  // Existing fields
  reviewedById            String?
  reviewedAt              DateTime?
  approvedById            String?
  approvedAt              DateTime?
  rejectedReason          String?
  notes                   String?
  createdAt               DateTime      @default(now())
  updatedAt               DateTime      @updatedAt
  
  // Relations
  items                   PendingItem[]
  vendor                  Vendor?       @relation(fields: [vendorId], references: [id])
  vendorId                String?
  reviewer                User?         @relation("ReviewedPurchases", fields: [reviewedById], references: [id])
  approver                User?         @relation("ApprovedPurchases", fields: [approvedById], references: [id])
  
  // NEW: Relation to client details
  clientDetails           ClientDetails?
  
  @@index([status])
  @@index([quoteConfirmationToken])
  @@index([customerEmail])
}
```

### 2. Create `ClientDetails` Model

New model to store client information collected after quote acceptance:

```prisma
model ClientDetails {
  id                    String          @id @default(cuid())
  pendingPurchaseId     String          @unique
  pendingPurchase       PendingPurchase @relation(fields: [pendingPurchaseId], references: [id], onDelete: Cascade)
  
  // Personal Information
  fullName              String
  surname               String
  idNumber              String          // South African ID number
  email                 String
  phone                 String
  dateOfBirth           DateTime?       // Extracted from ID number
  
  // Address Information
  physicalAddress       String          // Full physical address
  physicalStreet        String?
  physicalCity          String?
  physicalProvince      String?
  physicalPostalCode    String?
  
  postalAddress         String?         // If different from physical
  postalCity            String?
  postalProvince        String?
  postalPostalCode      String?
  
  // Banking Information (Optional - for future payouts)
  bankName              String?
  accountNumber         String?
  accountType           String?         // Cheque, Savings
  branchCode            String?
  accountHolderName     String?
  
  // Document Uploads
  proofOfIdUrl          String?         // URL to uploaded ID document
  proofOfAddressUrl     String?         // URL to uploaded proof of address
  bankConfirmationUrl   String?         // URL to bank confirmation letter
  
  // Metadata
  ipAddress             String?         // Client IP for security
  userAgent             String?         // Browser info
  submittedAt           DateTime        @default(now())
  verifiedAt            DateTime?       // When admin verified details
  verifiedById          String?
  verifiedBy            User?           @relation(fields: [verifiedById], references: [id])
  
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  
  @@index([email])
  @@index([idNumber])
  @@index([pendingPurchaseId])
}
```

### 3. Update `PurchaseStatus` Enum

Add new statuses for quote workflow:

```prisma
enum PurchaseStatus {
  PENDING_REVIEW        // Initial status from bot
  UNDER_REVIEW          // Admin is reviewing
  APPROVED              // Admin approved items
  REJECTED              // Admin rejected entire purchase
  PRICE_ADJUSTED        // Prices were adjusted
  
  // NEW: Quote workflow statuses
  QUOTE_SENT            // Admin sent quote to client via email
  CLIENT_ACCEPTED       // Client accepted quote
  CLIENT_DECLINED       // Client declined quote
  AWAITING_PAYMENT      // Client accepted & submitted details, awaiting payment
  PAYMENT_RECEIVED      // Payment completed
  
  COMPLETED             // Purchase fully completed
  CANCELLED             // Purchase cancelled
}
```

### 4. Update `User` Model (if needed)

Add relations for client details verification:

```prisma
model User {
  // ... existing fields ...
  
  // NEW: Relation for verified client details
  verifiedClientDetails ClientDetails[]
  
  // ... existing relations ...
}
```

---

## 🛠️ Implementation Steps

### Step 1: Update Prisma Schema

1. Open `prisma/schema.prisma`
2. Add new fields to `PendingPurchase` model
3. Create `ClientDetails` model
4. Update `PurchaseStatus` enum
5. Update `User` model relations

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

This regenerates the Prisma client with new types.

### Step 3: Create Migration

```bash
npx prisma migrate dev --name add-quote-confirmation-workflow
```

This will:
- Create a new migration file
- Apply the migration to your database
- Regenerate Prisma client

### Step 4: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to verify tables
npx prisma studio
```

In Prisma Studio:
- Check `PendingPurchase` has new fields
- Verify `ClientDetails` table exists
- Confirm indexes are created

### Step 5: Update TypeScript Types

Create type definitions for use in components:

**File:** `types/quote.ts` (NEW)

```typescript
import { ClientDetails, PendingPurchase, PendingItem } from "@prisma/client"

export type PurchaseWithDetails = PendingPurchase & {
  items: PendingItem[]
  clientDetails?: ClientDetails | null
}

export type ClientDetailsFormData = {
  // Personal Info
  fullName: string
  surname: string
  idNumber: string
  email: string
  phone: string
  
  // Address
  physicalAddress: string
  physicalStreet?: string
  physicalCity?: string
  physicalProvince?: string
  physicalPostalCode?: string
  
  postalAddress?: string
  postalCity?: string
  postalProvince?: string
  postalPostalCode?: string
  
  // Banking (optional)
  bankName?: string
  accountNumber?: string
  accountType?: string
  branchCode?: string
  accountHolderName?: string
  
  // Files
  proofOfIdFile?: File
  proofOfAddressFile?: File
  bankConfirmationFile?: File
}

export type QuoteConfirmationResponse = {
  success: boolean
  token?: string
  message: string
  expiresAt?: string
}
```

---

## 🧪 Testing Database Changes

### Test 1: Create Test Records

Create a test script to verify schema works:

**File:** `scripts/test-quote-schema.ts` (NEW)

```typescript
import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

const prisma = new PrismaClient()

async function testQuoteSchema() {
  console.log("🧪 Testing Quote Confirmation Schema...\n")
  
  // Test 1: Create PendingPurchase with quote fields
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
  
  // Test 4: Find by token
  const foundByToken = await prisma.pendingPurchase.findUnique({
    where: { quoteConfirmationToken: token }
  })
  
  console.log("✅ Found by token:", !!foundByToken)
  
  // Cleanup
  await prisma.clientDetails.delete({ where: { id: clientDetails.id } })
  await prisma.pendingPurchase.delete({ where: { id: purchase.id } })
  
  console.log("\n✅ All tests passed! Schema is working correctly.")
}

testQuoteSchema()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run the test:

```bash
npx tsx scripts/test-quote-schema.ts
```

---

## ✅ Completion Checklist

- [ ] Updated `PendingPurchase` model with quote fields
- [ ] Created `ClientDetails` model
- [ ] Updated `PurchaseStatus` enum with new statuses
- [ ] Updated `User` model relations
- [ ] Generated Prisma client (`npx prisma generate`)
- [ ] Created and applied migration (`npx prisma migrate dev`)
- [ ] Verified migration in Prisma Studio
- [ ] Created TypeScript type definitions (`types/quote.ts`)
- [ ] Created and ran test script
- [ ] All tests passed
- [ ] Committed changes to git

---

## 📝 Git Backup

After completing this phase:

```bash
git add prisma/schema.prisma prisma/migrations types/quote.ts scripts/test-quote-schema.ts
git commit -m "Phase 1 Complete: Quote confirmation database schema"
git tag -a quote-workflow-phase-1-complete -m "Database schema for quote confirmation workflow"
```

---

## 🔗 Next Steps

Once Phase 1 is complete:
1. Read `PHASE_2_BACKEND_APIS.md`
2. Start building the "Send Quote" API endpoint
3. Implement token generation logic

---

## 🐛 Troubleshooting

### Issue: Migration fails with existing data

**Solution:** If you have existing `PendingPurchase` records, you may need to handle defaults:

```bash
# Reset database (DEV ONLY - deletes all data)
npx prisma migrate reset

# Or manually update existing records
npx prisma studio
# Set quoteConfirmationToken to null for existing records
```

### Issue: Prisma client not updating

**Solution:** Force regenerate:

```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: TypeScript errors after migration

**Solution:** Restart TypeScript server in your IDE:
- VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
- Cursor: Same as above

---

**Phase Status:** 🔴 Not Started  
**Next Phase:** `PHASE_2_BACKEND_APIS.md`  
**Questions?** Refer to main `QUOTE_CONFIRMATION_WORKFLOW.md`
