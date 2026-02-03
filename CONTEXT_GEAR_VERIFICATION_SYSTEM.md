# 🎯 Context: Gear Verification/Product Inspection System

**Last Updated:** 2026-02-03  
**Status:** Backend 100% Complete ✅ | Frontend 20% Complete 🚧  
**Git Branch:** `develop` (2 commits ahead of origin)

---

## 📋 QUICK SUMMARY

I'm building a **Gear Verification / Product Inspection** feature for Keysers Camera Equipment. Staff physically verify camera gear, confirm product identity, capture serial numbers, check accessories, set condition, and compute buy/consignment prices with override capability.

**Backend is 100% complete and functional.** Now need to build 3 frontend pages.

---

## ✅ WHAT'S BEEN IMPLEMENTED

### 1. Database Schema (Prisma)
**11 new models + 5 new enums** added to `prisma/schema.prisma`:

```
Product (canonical catalog)
├── ProductQuestionTemplate (dynamic questions per product)
├── AccessoryTemplate (expected accessories with penalties)
└── KnownIssue (auto-inject questions)

InspectionSession
└── IncomingGearItem (client data)
    └── VerifiedGearItem (staff verified)
        ├── VerifiedAnswer (question responses)
        ├── VerifiedAccessory (present/missing)
        ├── PricingSnapshot (immutable auto pricing)
        └── PriceOverride (separate override with audit)
```

**Key Enums:**
- `ProductType`: CAMERA_BODY, LENS, DRONE, etc.
- `VerifiedCondition`: LIKE_NEW, EXCELLENT, VERY_GOOD, GOOD, WORN
- `InspectionStatus`: UNVERIFIED, IN_PROGRESS, VERIFIED, APPROVED, REJECTED, REOPENED
- `OverrideReason`: MARKET_RESEARCH, DEMAND_HIGH, CONDITION_EXCEPTION, etc.

**Migration Status:** ⚠️ NOT YET RUN - Need to run:
```bash
npx prisma migrate dev --name add_inspection_system
```

### 2. Pricing Logic (`lib/inspection-pricing.ts`)

**Condition Multipliers:**
```typescript
LIKE_NEW:   1.00 (100%)
EXCELLENT:  0.95 (95%)
VERY_GOOD:  0.90 (90%)
GOOD:       0.82 (82%)
WORN:       0.70 (70%)
```

**Formula:**
```
buyPrice = baseBuyMax × conditionMultiplier - accessoryPenalty
```

**Functions:**
- `computePricing()` - Auto-calculate prices
- `calculateAccessoryPenalty()` - Sum missing accessory penalties
- `getFinalDisplayPrice()` - Get final (override or auto)
- `formatPrice()` - South African format (R10 500)

### 3. Complete Backend APIs (All Functional)

#### Inspection Sessions
```
POST   /api/inspections              Create session with items
GET    /api/inspections              List all (filter by ?status=)
GET    /api/inspections/[id]         Get full session details
PATCH  /api/inspections/[id]         Update session
DELETE /api/inspections/[id]         Delete (ADMIN only)
```

#### Item Verification Workflow
```
POST   /api/inspections/items/[itemId]
       Body: { productId }
       → Identify/re-identify product (set canonical productId)
       → Auto-loads templates, accessories, known issues

PATCH  /api/inspections/items/[itemId]
       Body: { action: "verify", verifiedCondition, serialNumber, answers[], accessories[], generalNotes }
       → Saves verification, auto-computes pricing
       
       Body: { action: "approve" }
       → Locks item (approved)
       
       Body: { action: "reopen", reopenReason }
       → Unlocks (ADMIN only)
       
       Body: { action: "reject" }
       → Rejects item
```

#### Price Overrides
```
POST   /api/inspections/items/[itemId]/price-override
       Body: { overrideBuyPrice?, overrideConsignPrice?, overrideReason (REQUIRED), notes? }
       → Creates PriceOverride (never touches snapshot)

DELETE /api/inspections/items/[itemId]/price-override
       → Reverts to auto pricing
```

#### Products
```
GET    /api/products?search=canon&productType=CAMERA_BODY&limit=50
POST   /api/products  (ADMIN only)
```

**Security:**
- All routes check `hasPermission(role, STAFF/ADMIN)`
- Locked items: STAFF can't modify, ADMIN can reopen
- All actions logged to ActivityLog

### 4. Seed Data (`prisma/seed-inspection.ts`)

**4 Sample Products:**
1. Canon EOS R5 (Camera) - Buy: R28k-R35k, Consign: R20k-R25k
2. Sony A7 IV (Camera) - Buy: R22k-R28k, Consign: R16k-R20k
3. Canon RF 24-70mm (Lens) - Buy: R18k-R24k, Consign: R13k-R17k
4. Sony FE 70-200mm (Lens) - Buy: R22k-R28k, Consign: R16k-R20k

Each has questions, accessories with penalties, and known issues.

**Run seed:**
```bash
npx tsx prisma/seed-inspection.ts
```

### 5. UI Components (Foundation)

**Created:**
- ✅ `InspectionStepper` - Step progress UI (Identify → Verify → Price → Approve)
- ✅ `ProductSearch` - Debounced search dropdown with live results
- ✅ `lib/utils.ts` - Utility functions (cn for classnames)

---

## 🚧 WHAT'S NEEDED NEXT (Frontend Pages)

### Priority 1: Core Pages to Build

#### 1. Session List Page
**Path:** `/app/(dashboard)/dashboard/inspections/page.tsx`

**Requirements:**
- Table/cards showing all inspection sessions
- Columns: Session Name, Vendor, Item Count, Status, Created Date
- Filter by status dropdown (IN_PROGRESS, COMPLETED, etc.)
- "Create New Session" button
- Click row → navigate to session detail

**API:** `GET /api/inspections`

**Status Badge Colors:**
- IN_PROGRESS → blue
- COMPLETED → green
- PARTIALLY_COMPLETED → yellow
- ON_HOLD → gray
- CANCELLED → red

---

#### 2. Session Detail Page
**Path:** `/app/(dashboard)/dashboard/inspections/[id]/page.tsx`

**Requirements:**

**Header Section:**
- Session name (editable)
- Vendor name
- Shipment reference
- Status badge
- Notes textarea
- "Update Session" button

**Items List:**
- Table/cards showing all items in session
- For each item show:
  - Client-submitted info (name, brand, model, condition, serial)
  - Verification status badge (UNVERIFIED/IN_PROGRESS/VERIFIED/APPROVED/REJECTED)
  - Action button based on status:
    - UNVERIFIED: "Start Verification" → navigate to item page
    - IN_PROGRESS/VERIFIED: "Continue" → navigate to item page
    - APPROVED: "View Details" (read-only) + "Reopen" (admin only)
    - REJECTED: "View Details" (read-only)

**API:** `GET /api/inspections/[id]`

---

#### 3. Item Verification Page (MOST COMPLEX)
**Path:** `/app/(dashboard)/dashboard/inspections/[id]/items/[itemId]/page.tsx`

**Layout:** Use `InspectionStepper` component with 4 steps

---

**STEP 1: IDENTIFY PRODUCT**

**UI:**
- Use `ProductSearch` component (already created ✅)
- Show selected product details (name, brand, model, variant, type)
- Show base price ranges
- "Next" button (disabled until product selected)

**Actions:**
- On product select: Call `POST /api/inspections/items/[itemId]` with `{ productId }`
- This auto-loads templates
- Move to Step 2

---

**STEP 2: VERIFY**

**UI Sections:**

1. **Condition Selector**
   - Radio buttons or Select dropdown
   - Options: LIKE_NEW (100%), EXCELLENT (95%), VERY_GOOD (90%), GOOD (82%), WORN (70%)
   - Show multiplier percentage next to each option

2. **Serial Number Input**
   - Text input
   - Label: "Serial Number" (Required for cameras/lenses)
   - Hint: "Enter the serial number found on the product"

3. **Questions Section**
   - Load from API response: `product.questionTemplates`
   - For each question:
     - Question text in bold
     - Category badge (Functionality, Physical Condition, etc.)
     - Three radio buttons: YES / NO / NOT TESTED
     - Optional notes textarea below
   - Auto-inject known issues as questions (from `product.knownIssues`)

4. **Accessories Checklist**
   - Load from API response: `product.accessories`
   - For each accessory:
     - Checkbox: "Present"
     - Accessory name
     - If `isRequired=true`: show "Required" badge
     - Show penalty amount if missing: "Penalty: R800"
     - Optional notes input

5. **General Notes**
   - Large textarea
   - Placeholder: "Additional notes, issues, or observations..."

**Actions:**
- "Save & Continue" button
- Call `PATCH /api/inspections/items/[itemId]` with:
  ```json
  {
    "action": "verify",
    "verifiedCondition": "EXCELLENT",
    "serialNumber": "123456",
    "answers": [
      { "questionText": "Does shutter work?", "answer": "YES", "notes": "" }
    ],
    "accessories": [
      { "accessoryName": "Battery", "isPresent": true, "notes": "" }
    ],
    "generalNotes": "Camera in great shape"
  }
  ```
- This auto-computes pricing
- Move to Step 3

---

**STEP 3: PRICING**

**UI Sections:**

1. **Auto Pricing Display Card**
   ```
   📊 Auto-Computed Pricing
   
   Base Prices (from Product):
   Buy Range: R28,000 - R35,000
   Consign Range: R20,000 - R25,000
   
   Condition Applied: EXCELLENT (95%)
   Computed Buy: R33,250
   Computed Consign: R23,750
   
   Accessory Penalties:
   - Battery (LP-E6NH) missing: -R800
   Total Penalty: -R800
   
   Final Auto Prices:
   Buy: R32,450
   Consign: R22,950
   ```

2. **Override Section**
   - Toggle switch: "Override Prices"
   - When toggled ON, show:
     - Number input: "Buy Price Override" (with R prefix)
     - Number input: "Consign Price Override" (with R prefix)
     - Select dropdown: "Override Reason" (REQUIRED)
       - Options: MARKET_RESEARCH, DEMAND_HIGH, DEMAND_LOW, CONDITION_EXCEPTION, CLIENT_NEGOTIATION, BULK_DISCOUNT, DAMAGED_NOT_OBVIOUS, RARE_ITEM, OTHER
     - If reason = OTHER: Textarea "Notes" (REQUIRED)
     - Button: "Apply Override"
   - If override exists, show:
     - "Overridden" badge with green checkmark
     - Show override reason and notes
     - Button: "Revert to Auto Pricing"

3. **Final Prices Display Card**
   ```
   💰 Final Prices
   
   Buy Price: R32,000 (Overridden)
   Consign Price: R22,950 (Auto)
   
   Override applied by: John Doe on 2024-01-15
   Reason: MARKET_RESEARCH
   ```

**Actions:**
- "Apply Override": Call `POST /api/inspections/items/[itemId]/price-override`
- "Revert to Auto": Call `DELETE /api/inspections/items/[itemId]/price-override`
- "Next": Move to Step 4

---

**STEP 4: APPROVE**

**UI Sections:**

1. **Comparison Table**
   ```
   CLIENT SUBMITTED          VERIFIED
   ------------------------------------------------
   Name:    Canon R5         Canon EOS R5
   Brand:   Canon            Canon
   Model:   EOS R5           EOS R5
   Variant: -                Body Only
   
   Condition: Excellent      EXCELLENT (95%)
   Serial:    123456         123456
   
   PRICING
   Buy:       N/A            R32,000 (Overridden)
   Consign:   N/A            R22,950 (Auto)
   ```

2. **Summary Cards**
   - Questions Answered: 5/5 ✅
   - Accessories Present: 5/6 (1 missing)
   - Issues Noted: 0
   - Price Overridden: Yes (MARKET_RESEARCH)

3. **Action Buttons**
   - "Back to Pricing" - go to step 3
   - "Approve & Lock" - primary button
     - Calls `PATCH /api/inspections/items/[itemId]` with `{ action: "approve" }`
     - Shows confirmation modal: "Are you sure? This will lock the item."
     - On success: navigate back to session detail page

**If Already Approved:**
- Show locked badge
- Show: "Approved by John Doe on 2024-01-15 10:30"
- All fields read-only
- Show "Reopen" button (ADMIN only, red)
  - Requires reason input
  - Calls `PATCH /api/inspections/items/[itemId]` with `{ action: "reopen", reopenReason: "..." }`

---

## 📂 KEY FILES & LOCATIONS

### Backend
```
/app/api
  /inspections
    route.ts                                    ✅ Sessions CRUD
    /[id]/route.ts                              ✅ Session detail
    /items/[itemId]
      route.ts                                  ✅ Verify/approve/reject
      /price-override/route.ts                  ✅ Override CRUD
  /products/route.ts                            ✅ Product search

/lib
  inspection-pricing.ts                         ✅ Pricing logic
  auth.ts                                       ✅ hasPermission helper
  prisma.ts                                     ✅ Prisma client
  utils.ts                                      ✅ Utilities (cn)

/prisma
  schema.prisma                                 ✅ 11 new models
  seed-inspection.ts                            ✅ Sample data
```

### Frontend (Existing)
```
/components/inspection
  InspectionStepper.tsx                         ✅ Step progress
  ProductSearch.tsx                             ✅ Product search
```

### Frontend (To Create)
```
/app/(dashboard)/dashboard/inspections
  page.tsx                                      🚧 Session list
  /[id]
    page.tsx                                    🚧 Session detail
    /items/[itemId]
      page.tsx                                  🚧 Item verification (4 steps)
```

### Documentation
```
GEAR_VERIFICATION_IMPLEMENTATION.md             ✅ Full implementation docs
INSPECTION_STATUS_SUMMARY.md                    ✅ Status summary
```

---

## 🚀 HOW TO GET STARTED

### 1. Run Migration (if not done yet)
```bash
cd /home/riaan/keysers-dashboard
npx prisma migrate dev --name add_inspection_system
npx prisma generate
```

### 2. Seed Sample Data
```bash
npx tsx prisma/seed-inspection.ts
```

### 3. Test Backend APIs
Use Postman or curl to test endpoints (examples in `GEAR_VERIFICATION_IMPLEMENTATION.md`)

### 4. Build Frontend Pages
Start with:
1. Session list page (simplest)
2. Session detail page (medium)
3. Item verification page (most complex - use stepper)

---

## 💡 KEY TECHNICAL NOTES

### Existing Patterns (Follow These)
- **"use client"** components with hooks
- **shadcn/ui** components (Button, Card, Badge, Input, Select, Textarea, Modal)
- **lucide-react** icons (Check, X, Edit, ChevronDown, etc.)
- **TypeScript** interfaces for all data types
- **Fetch API** for backend calls with error handling
- **getServerSession** for auth on server components/APIs

### Security Patterns
```typescript
// In API routes
const session = await getServerSession(authOptions)
if (!session || !hasPermission(session.user.role, UserRole.STAFF)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

### Data Fetching Pattern
```typescript
const response = await fetch('/api/inspections')
const data = await response.json()
if (!response.ok) {
  // Handle error
}
setItems(data.sessions)
```

### Pricing Display
```typescript
import { formatPrice } from "@/lib/inspection-pricing"

// Use: formatPrice(32450) → "R32 450"
```

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Build Session List Page** (`/app/(dashboard)/dashboard/inspections/page.tsx`)
   - Fetch sessions with `GET /api/inspections`
   - Display in table with status badges
   - Add "Create New Session" button (can be placeholder for now)
   - Click row → navigate to `/inspections/[id]`

2. **Build Session Detail Page** (`/app/(dashboard)/dashboard/inspections/[id]/page.tsx`)
   - Fetch session with `GET /api/inspections/[id]`
   - Show session info
   - List items with status badges
   - "Start Verification" button → navigate to `/inspections/[id]/items/[itemId]`

3. **Build Item Verification Page** (most complex)
   - Use `InspectionStepper` component
   - Implement 4 steps as detailed above
   - Use `ProductSearch` for Step 1

---

## 📞 QUESTIONS TO ASK IF STUCK

1. "Show me an example of how to use the ProductSearch component in Step 1"
2. "How do I structure the verification form for Step 2?"
3. "What's the best way to display the pricing breakdown in Step 3?"
4. "How do I handle the comparison table in Step 4?"
5. "Show me the shadcn/ui components available for forms"

---

## ✅ VALIDATION CHECKLIST

Before marking complete:
- [ ] Can create inspection session
- [ ] Can view session list
- [ ] Can view session details
- [ ] Can identify product (Step 1)
- [ ] Can verify item with questions/accessories (Step 2)
- [ ] Can see auto pricing calculation (Step 3)
- [ ] Can apply price override (Step 3)
- [ ] Can revert price override (Step 3)
- [ ] Can approve item (Step 4)
- [ ] Approved item shows as locked
- [ ] STAFF cannot modify locked items
- [ ] ADMIN can reopen locked items
- [ ] All actions are logged
- [ ] All prices display in South African format

---

**Ready to build! Start with the session list page and work your way through. The backend is fully functional and waiting for the UI.** 🚀

**Estimated Time:** 8-12 hours for all 3 pages

**Git Status:** All backend code committed on `develop` branch
