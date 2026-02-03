# Gear Verification / Product Inspection System - Implementation Guide

## 📋 Overview

This document details the complete implementation of the Gear Verification / Product Inspection feature for Keysers Camera Equipment.

**Status:** ✅ **Core Implementation Complete**

## 🎯 What's Been Implemented

### ✅ 1. Data Models (Prisma Schema)

**New Models Added:**
- ✅ `Product` - Canonical product catalog
- ✅ `InspectionSession` - Groups items being inspected
- ✅ `IncomingGearItem` - Client-submitted info (before verification)
- ✅ `VerifiedGearItem` - After staff identifies and verifies product
- ✅ `ProductQuestionTemplate` - Rule-driven questions per product/type
- ✅ `VerifiedAnswer` - Staff responses (Yes/No/NotTested)
- ✅ `AccessoryTemplate` - Expected accessories per product
- ✅ `VerifiedAccessory` - Actual accessories present/missing
- ✅ `KnownIssue` - Common issues per product (auto-inject questions)
- ✅ `PricingSnapshot` - Auto-computed prices (never overwritten)
- ✅ `PriceOverride` - Manual overrides with required reason + audit

**New Enums:**
- `ProductType` (CAMERA_BODY, LENS, DRONE, etc.)
- `SessionStatus` (IN_PROGRESS, COMPLETED, etc.)
- `InspectionStatus` (UNVERIFIED, IN_PROGRESS, VERIFIED, APPROVED, REJECTED, REOPENED)
- `VerifiedCondition` (LIKE_NEW, EXCELLENT, VERY_GOOD, GOOD, WORN)
- `AnswerType` (YES, NO, NOT_TESTED)
- `OverrideReason` (MARKET_RESEARCH, DEMAND_HIGH, etc.)

### ✅ 2. Pricing Logic (`lib/inspection-pricing.ts`)

**Condition Multipliers:**
```typescript
LIKE_NEW:    1.00 (100%)
EXCELLENT:   0.95 (95%)
VERY_GOOD:   0.90 (90%)
GOOD:        0.82 (82%)
WORN:        0.70 (70%)
```

**Auto Pricing Formula:**
```
computedBuyPrice = round(baseBuyMax * conditionMultiplier)
computedConsignPrice = round(baseConsignMax * conditionMultiplier)
finalPrice = computedPrice - accessoryPenalty
```

**Features:**
- ✅ Condition-based multipliers
- ✅ Accessory penalty calculation
- ✅ Price override system (stores separately, never overwrites snapshot)
- ✅ Display final price (auto or override)
- ✅ South African price formatting (R10 500)

### ✅ 3. Backend API Routes

#### **Inspection Sessions**

**`POST /api/inspections`** - Create new session
- Accepts: sessionName, shipmentReference, vendorId, notes, items[]
- Creates inspection session with incoming items
- Returns: session with items
- Auth: STAFF+

**`GET /api/inspections`** - List all sessions
- Query params: ?status=IN_PROGRESS
- Returns: sessions with items and verification status
- Auth: STAFF+

**`GET /api/inspections/[id]`** - Get specific session
- Returns: full session details with all items, verifications, pricing
- Auth: STAFF+

**`PATCH /api/inspections/[id]`** - Update session
- Update: sessionName, status, notes, etc.
- Auth: STAFF+

**`DELETE /api/inspections/[id]`** - Delete session
- Auth: ADMIN only

#### **Individual Items**

**`POST /api/inspections/items/[itemId]`** - Identify product
- Accepts: productId
- Creates or updates VerifiedGearItem
- Loads product templates (questions, accessories, known issues)
- Updates status to IN_PROGRESS
- Logs: IDENTIFIED_PRODUCT or RE_IDENTIFIED_PRODUCT
- Auth: STAFF+

**`GET /api/inspections/items/[itemId]`** - Get item details
- Returns: full verification details, pricing, overrides
- Auth: STAFF+

**`PATCH /api/inspections/items/[itemId]`** - Update verification

Actions:
- **`action: "verify"`** - Save verification details
  - Accepts: serialNumber, verifiedCondition, generalNotes, answers[], accessories[]
  - Computes pricing automatically
  - Creates PricingSnapshot
  - Updates status to VERIFIED
  
- **`action: "approve"`** - Approve and lock
  - Sets approvedAt, approvedById
  - Sets locked = true
  - Updates status to APPROVED
  - Auth: STAFF+
  
- **`action: "reopen"`** - Reopen approved item
  - Requires reopenReason
  - Sets locked = false
  - Updates status to REOPENED
  - Auth: ADMIN only
  
- **`action: "reject"`** - Reject item
  - Updates status to REJECTED
  - Auth: STAFF+

#### **Price Overrides**

**`POST /api/inspections/items/[itemId]/price-override`** - Apply override
- Accepts: overrideBuyPrice?, overrideConsignPrice?, overrideReason (REQUIRED), notes?
- Validates: at least one price must be overridden
- Validates: overrideReason must be from enum
- If reason = OTHER, notes are required
- Creates/updates PriceOverride record
- Never touches PricingSnapshot (keeps auto pricing)
- Logs: PRICE_OVERRIDE_APPLIED
- Auth: STAFF+ (locked items need ADMIN)

**`DELETE /api/inspections/items/[itemId]/price-override`** - Revert to auto
- Deletes PriceOverride
- Auto pricing from snapshot is used
- Logs: PRICE_OVERRIDE_REVERTED
- Auth: STAFF+ (locked items need ADMIN)

#### **Products**

**`GET /api/products`** - Search/list products
- Query params: ?search=canon&productType=CAMERA_BODY&limit=50
- Returns: products with pricing ranges
- Auth: STAFF+

**`POST /api/products`** - Create product
- Accepts: full product details
- Auth: ADMIN only

### ✅ 4. Seed Data (`prisma/seed-inspection.ts`)

**Sample Products:**
- Canon EOS R5 (Camera Body)
- Sony A7 IV (Camera Body)
- Canon RF 24-70mm f/2.8L IS USM (Lens)
- Sony FE 70-200mm f/2.8 GM OSS II (Lens)

**Each product includes:**
- ✅ Base pricing ranges (buy + consignment)
- ✅ Question templates (5-8 per product)
- ✅ Accessory templates with penalties
- ✅ Known issues (auto-inject questions)

**Run seed data:**
```bash
npx tsx prisma/seed-inspection.ts
```

### ✅ 5. UI Components (`components/inspection/`)

**`InspectionStepper.tsx`** - Step progress indicator
- Features: visual step progress, click navigation, completed/current states
- Steps: Identify → Verify → Price → Approve

**`ProductSearch.tsx`** - Searchable product dropdown
- Features: debounced search, live results, selection display
- Shows: product name, brand, model, variant, type, price ranges
- Integrates: `/api/products` endpoint

### ✅ 6. Security & Roles

**Role-Based Access Control:**
- ✅ `hasPermission()` helper enforced on all endpoints
- ✅ STAFF can: create sessions, identify products, verify, approve
- ✅ ADMIN only can: delete sessions, reopen approved items, create products
- ✅ Locked items: STAFF cannot modify, ADMIN can reopen
- ✅ All actions logged in ActivityLog

**Audit Trail:**
- ✅ Every action logged: IDENTIFIED_PRODUCT, VERIFIED_ITEM, APPROVED_VERIFIED_ITEM, PRICE_OVERRIDE_APPLIED, etc.
- ✅ Who, what, when tracked
- ✅ Price overrides: user, reason, notes, timestamp

---

## 🚀 How to Use the System

### Step 1: Run Database Migration

```bash
cd /home/riaan/keysers-dashboard

# Create and apply migration
npx prisma migrate dev --name add_inspection_system

# Generate Prisma client (already done)
npx prisma generate
```

### Step 2: Seed Sample Data

```bash
# Run inspection seed file
npx tsx prisma/seed-inspection.ts
```

This creates:
- 4 sample products (2 cameras, 2 lenses)
- Question templates
- Accessory templates with penalties
- Known issues

### Step 3: Create Inspection Session (API)

```bash
curl -X POST http://localhost:3000/api/inspections \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "sessionName": "Test Shipment - Canon Gear",
    "shipmentReference": "SHIP-001",
    "notes": "Test shipment",
    "items": [
      {
        "clientName": "Canon R5",
        "clientBrand": "Canon",
        "clientModel": "EOS R5",
        "clientDescription": "Like new condition",
        "clientSerialNumber": "123456789",
        "clientCondition": "Excellent",
        "clientImages": []
      }
    ]
  }'
```

### Step 4: Identify Product

```bash
# Get product ID from search
curl http://localhost:3000/api/products?search=canon%20r5

# Identify the item
curl -X POST http://localhost:3000/api/inspections/items/[itemId] \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "productId": "[productId from search]"
  }'
```

### Step 5: Verify Item

```bash
curl -X PATCH http://localhost:3000/api/inspections/items/[itemId] \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "action": "verify",
    "serialNumber": "123456789",
    "verifiedCondition": "EXCELLENT",
    "generalNotes": "Camera in excellent condition",
    "answers": [
      {
        "questionText": "Does the shutter fire correctly?",
        "answer": "YES",
        "notes": "Shutter works perfectly"
      }
    ],
    "accessories": [
      {
        "accessoryName": "Battery Charger (LC-E6)",
        "isPresent": true,
        "notes": ""
      },
      {
        "accessoryName": "Battery (LP-E6NH)",
        "isPresent": false,
        "notes": "Missing battery"
      }
    ]
  }'
```

This will:
- Save verification details
- Auto-compute pricing with condition multiplier
- Apply accessory penalties for missing items
- Create PricingSnapshot
- Update status to VERIFIED

### Step 6: Apply Price Override (Optional)

```bash
curl -X POST http://localhost:3000/api/inspections/items/[itemId]/price-override \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "overrideBuyPrice": 32000,
    "overrideConsignPrice": 23000,
    "overrideReason": "MARKET_RESEARCH",
    "notes": "Competitor selling similar unit at higher price"
  }'
```

### Step 7: Approve Item

```bash
curl -X PATCH http://localhost:3000/api/inspections/items/[itemId] \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "action": "approve"
  }'
```

This locks the item. Only admins can reopen.

---

## 📊 Database Schema Diagram

```
InspectionSession
├── incomingItems[] (IncomingGearItem)
    └── verifiedItem (VerifiedGearItem)
        ├── product (Product)
        │   ├── accessories[] (AccessoryTemplate)
        │   ├── knownIssues[] (KnownIssue)
        │   └── questionTemplates[] (ProductQuestionTemplate)
        ├── answers[] (VerifiedAnswer)
        ├── accessories[] (VerifiedAccessory)
        ├── pricingSnapshot (PricingSnapshot)
        └── priceOverride? (PriceOverride)
```

---

## 🎨 UI Flow (To Be Completed)

### Inspection Session List
- `/app/(dashboard)/dashboard/inspections/page.tsx`
- Shows: All sessions with status badges
- Actions: Create new, view details, filter by status

### Inspection Session Detail
- `/app/(dashboard)/dashboard/inspections/[id]/page.tsx`
- Shows: Session details, list of all items
- Per item: client info, verification status, actions

### Item Verification Flow
- `/app/(dashboard)/dashboard/inspections/[id]/items/[itemId]/page.tsx`
- **Step 1: Identify** - ProductSearch component
- **Step 2: Verify** - Condition, Serial, Questions, Accessories
- **Step 3: Price** - Show computed prices, override UI
- **Step 4: Approve** - Summary, compare client vs verified, approve button

---

## 🔐 Security Features

✅ **Role-based access** on all endpoints
✅ **Locked items** prevent modification (admin only can reopen)
✅ **Required override reasons** with enum validation
✅ **Audit logging** for all critical actions
✅ **Never overwrite** auto pricing snapshots
✅ **Separate storage** for overrides (audit-friendly)

---

## 🧪 Testing Checklist

### Backend API Tests
- [ ] Create inspection session
- [ ] List sessions
- [ ] Get session details
- [ ] Identify product for item
- [ ] Re-identify product (logs re-identification)
- [ ] Verify item with answers and accessories
- [ ] Check auto pricing calculation
- [ ] Apply price override (valid reason)
- [ ] Try override without reason (should fail)
- [ ] Revert override
- [ ] Approve item (locks it)
- [ ] Try to modify locked item as STAFF (should fail)
- [ ] Reopen item as ADMIN
- [ ] Try to reopen as STAFF (should fail)
- [ ] Reject item
- [ ] Search products
- [ ] Create product as ADMIN

### Pricing Logic Tests
- [ ] Verify condition multipliers apply correctly
- [ ] Test accessory penalty calculation
- [ ] Verify missing required accessory applies penalty
- [ ] Override buy price only (consign uses auto)
- [ ] Override consign price only (buy uses auto)
- [ ] Override both prices
- [ ] Check final display price uses override when present

### Security Tests
- [ ] STAFF can create sessions
- [ ] STAFF can verify items
- [ ] STAFF can approve items
- [ ] STAFF cannot delete sessions
- [ ] STAFF cannot reopen approved items
- [ ] ADMIN can reopen items
- [ ] ADMIN can delete sessions
- [ ] All actions logged in ActivityLog

---

## 📂 File Structure

```
/app
  /api
    /inspections
      route.ts                     ✅ List/create sessions
      /[id]
        route.ts                   ✅ Get/update/delete session
      /items
        /[itemId]
          route.ts                 ✅ Identify, verify, approve, reject
          /price-override
            route.ts               ✅ Apply/revert price override
    /products
      route.ts                     ✅ Search/list/create products

/lib
  inspection-pricing.ts            ✅ Pricing logic & utilities
  utils.ts                         ✅ Utility functions (cn)

/components
  /inspection
    InspectionStepper.tsx          ✅ Step progress indicator
    ProductSearch.tsx              ✅ Searchable product dropdown

/prisma
  schema.prisma                    ✅ Updated with all models
  seed-inspection.ts               ✅ Sample data for testing
```

---

## 🚧 What's Still Needed

### Frontend Pages (To Implement)
1. **Session List Page** - `/app/(dashboard)/dashboard/inspections/page.tsx`
2. **Session Detail Page** - `/app/(dashboard)/dashboard/inspections/[id]/page.tsx`
3. **Item Verification Page** - `/app/(dashboard)/dashboard/inspections/[id]/items/[itemId]/page.tsx`

### Additional UI Components
1. **VerificationForm** - Condition selector, serial input, questions, accessories
2. **PricingDisplay** - Show auto pricing, override UI, revert button
3. **ApprovalSummary** - Client vs verified comparison, approve button

### Nice-to-Have Features
- Bulk operations (approve multiple items)
- Print inspection report
- Export to PDF
- Barcode scanning for serial numbers
- Image upload for inspection photos
- Email notifications when sessions complete

---

## 📝 Migration Instructions

1. **Backup database first!**
   ```bash
   pg_dump keysers_dashboard > backup_before_inspection.sql
   ```

2. **Run migration:**
   ```bash
   npx prisma migrate dev --name add_inspection_system
   ```

3. **If migration fails, restore backup:**
   ```bash
   psql keysers_dashboard < backup_before_inspection.sql
   ```

4. **Seed sample data:**
   ```bash
   npx tsx prisma/seed-inspection.ts
   ```

---

## 💡 Key Implementation Notes

1. **No free text product names** - Once verified, items MUST link to canonical productId
2. **Pricing snapshots are immutable** - Overrides stored separately
3. **Every override needs a reason** - Enforced on API level
4. **Approved items are locked** - Only admins can reopen
5. **All actions are logged** - Full audit trail in ActivityLog
6. **Accessory penalties** are configurable per product
7. **Known issues auto-inject questions** - Reduces manual work
8. **Condition multipliers** are global constants (can be made configurable)

---

## 🎯 Next Steps

1. Create frontend pages for inspection workflow
2. Build remaining UI components
3. Add image upload for inspection photos
4. Test complete end-to-end workflow
5. Train staff on new system

---

**Implementation Date:** 2026-02-03
**Status:** Backend Complete ✅ | Frontend In Progress 🚧
**Next:** Create inspection session list and detail pages
