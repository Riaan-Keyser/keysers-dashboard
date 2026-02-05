# Terms & Conditions Implementation

**Date:** 2026-02-05
**Status:** ✅ Complete

## Overview

Added a comprehensive Terms & Conditions step (Step 5) to the client details form that dynamically shows appropriate agreements based on whether the client selected Buy-only items, Consignment items, or both.

## What Was Implemented

### 1. Product Selection Detection
- Reads client selections from localStorage
- Detects if any CONSIGNMENT items were selected
- Detects if any BUY items were selected
- Shows appropriate agreement(s) based on selections

### 2. New Step 5: Terms & Conditions

#### Consignment Agreement (shown if any consignment items)
**Includes:**
- Complete consignment terms and conditions
- Key sections:
  - Duration and consignment period
  - Pricing & commission structure
  - Ownership & risk
  - Return of unsold items policy
  - Condition reports acknowledgment
- **Consignment End Date selector** (required field)
  - Default: 3 months from current date
  - Client can customize the date
  - Date validation (must be future date)
- **Acceptance checkbox** (required)
  - Must be checked to proceed
  - References specific end date in agreement text

#### Purchase Agreement (shown if any buy items)
**Includes:**
- Complete purchase/supplier terms
- Key sections:
  - Sale of goods
  - Payment terms (48 hours EFT)
  - Ownership transfer
  - Warranties (lawful owner, no liens, accurate info)
  - Inspection acceptance
  - Indemnity clause
- **Acceptance checkbox** (required)
  - Must be checked to proceed

#### General Terms
- POPIA compliance notice
- Data protection statement

### 3. Form Fields Added

**New State Variables:**
```typescript
hasConsignmentItems: boolean  // True if any consignment items
hasBuyItems: boolean          // True if any buy items
```

**New Form Fields:**
```typescript
consignmentPeriodMonths: string  // Default "3"
consignmentEndDate: string       // Required for consignment
acceptBuyTerms: boolean          // Required if buy items
acceptConsignmentTerms: boolean  // Required if consignment items
```

### 4. Validation Logic

**Step 5 Validation:**
- If consignment items:
  - Consignment end date required
  - Consignment terms acceptance required
- If buy items:
  - Buy terms acceptance required
- Shows error messages if not accepted
- Blocks submission until all applicable terms accepted

### 5. Data Submission

**Updated API Submission:**
```typescript
{
  ...formData,
  productSelections,                    // BUY/CONSIGNMENT per item
  acceptedBuyTerms,                     // true/false/null
  acceptedConsignmentTerms,             // true/false/null
  consignmentEndDate,                   // YYYY-MM-DD or null
  // ... other fields
}
```

## User Flow

### Scenario 1: Buy-Only Items
1. Client selects only BUY for all items
2. Steps 1-4: Personal info, address, banking, documents
3. **Step 5:** Shows only Purchase Agreement
4. Client reads and checks "I accept Purchase Agreement"
5. Submit

### Scenario 2: Consignment-Only Items
1. Client selects only CONSIGNMENT for all items
2. Steps 1-4: Personal info, address, banking, documents
3. **Step 5:** Shows only Consignment Agreement
4. Client selects consignment end date
5. Client reads and checks "I accept Consignment Agreement"
6. Submit

### Scenario 3: Mixed (Both Buy and Consignment)
1. Client selects some BUY, some CONSIGNMENT
2. Steps 1-4: Personal info, address, banking, documents
3. **Step 5:** Shows BOTH agreements
   - Consignment Agreement (with date selector)
   - Purchase Agreement
4. Client must accept BOTH
5. Submit

## UI Features

### Dynamic Display
- Blue-themed box for Consignment Agreement
- Green-themed box for Purchase Agreement
- Scrollable terms content (max-height with overflow)
- Clear section headings
- Prominent checkboxes

### Consignment Date Selector
- HTML date input
- Pre-filled with default (3 months from now)
- Min date: Today
- Shows selected date in acceptance text
- Validates future date

### Visual Hierarchy
- Icons: Package (consignment), DollarSign (buy)
- Color coding: Blue (consignment), Green (buy)
- Checkbox alignment with terms text
- POPIA notice at bottom

## Validation & Error Handling

**Consignment Errors:**
- "Consignment end date is required"
- "You must accept the Consignment Agreement to continue"

**Buy Errors:**
- "You must accept the Purchase Agreement to continue"

**Display:**
- Red error text below checkbox
- Highlights missing fields
- Prevents submission until resolved

## Database/API Updates Needed

**Backend should store:**
- `acceptedBuyTerms` (boolean or null)
- `acceptedConsignmentTerms` (boolean or null)
- `consignmentEndDate` (date or null)
- Timestamp of acceptance

**Consider adding to `ClientDetails` model:**
```prisma
model ClientDetails {
  // ... existing fields ...
  acceptedBuyTerms         Boolean?
  acceptedConsignmentTerms Boolean?
  consignmentEndDate       DateTime?
  termsAcceptedAt          DateTime?
}
```

## Testing Checklist

### Test Buy-Only Flow:
- [ ] Select all items as BUY
- [ ] Complete steps 1-4
- [ ] Step 5 shows only Purchase Agreement
- [ ] Cannot submit without checking box
- [ ] Can submit after checking box

### Test Consignment-Only Flow:
- [ ] Select all items as CONSIGNMENT
- [ ] Complete steps 1-4
- [ ] Step 5 shows only Consignment Agreement
- [ ] Consignment date field shows (default 3 months)
- [ ] Cannot submit without date
- [ ] Cannot submit without checking box
- [ ] Can submit after both filled

### Test Mixed Flow:
- [ ] Select some BUY, some CONSIGNMENT
- [ ] Complete steps 1-4
- [ ] Step 5 shows BOTH agreements
- [ ] Must accept both to submit
- [ ] Must provide consignment date
- [ ] All validations work

### Test Date Selector:
- [ ] Default date is 3 months in future
- [ ] Can change date
- [ ] Cannot select past dates
- [ ] Date shows in acceptance text
- [ ] Date validates correctly

## Next Steps

### 1. Upload Actual Agreement PDFs
Please provide the actual PDFs so I can extract the exact legal text:
- `Consignment Agreement.pdf`
- `Supplier's Invoice.pdf`

I'll update the agreement text to match your documents exactly.

### 2. Database Migration
Add the new fields to store terms acceptance:
```bash
# Add to ClientDetails model
npx prisma migrate dev --name add_terms_acceptance
```

### 3. Backend Validation
Update the submit-details API to:
- Validate terms acceptance
- Store consignment end date
- Log acceptance timestamps
- Generate agreement documents for record

### 4. Email Notifications
Consider sending:
- Confirmation email with agreement copy
- Reminders before consignment period expires

### 5. Admin Dashboard
Add view to show:
- Which clients accepted which terms
- Consignment expiry dates
- Upcoming expirations

## Files Modified

- ✅ `app/(public)/quote/[token]/details/page.tsx`
  - Added Step 5 (Terms & Conditions)
  - Added consignment/buy detection
  - Added date selector
  - Added validation logic
  - Updated form submission

## Agreement Text Sources

**Current implementation uses:**
- Generic consignment agreement terms (standard industry practice)
- Generic purchase/supplier invoice terms

**Should be replaced with:**
- Your actual Consignment Agreement PDF content
- Your actual Supplier's Invoice terms

Please upload the PDFs so I can extract and use your exact legal language.

---

**Implementation Complete** ✅  
**Awaiting:** Actual agreement PDFs to finalize text  
**Status:** Ready for testing with generic terms
