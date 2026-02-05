# Client Product Selection Page Implementation

**Date:** 2026-02-05
**Status:** ✅ Complete & Ready to Test

## Overview

Implemented the `/quote/[token]/select-products` page that allows clients to review their inspected items and choose between **Buy** (immediate payment) vs **Consignment** (higher payout when sold) for each item.

## What Was Built

### 1. New API Endpoint: `/api/quote-confirmation/[token]/inspection`
**File:** `app/api/quote-confirmation/[token]/inspection/route.ts`

**Features:**
- Fetches full inspection session data with verified items
- Returns Buy vs Consignment pricing for each item
- Includes inspection details (condition, serial numbers, accessories, answers)
- Validates quote token and expiry

**Data Returned:**
```typescript
{
  purchase: { id, customerName, customerEmail, status },
  inspection: { sessionName, status, notes, completedAt },
  items: [
    {
      id, verifiedItemId, clientName, productName,
      productBrand, productModel, verifiedCondition,
      serialNumber, generalNotes,
      buyPrice,        // Immediate payment amount
      consignPrice,    // Consignment payout amount
      images, answers, accessories
    }
  ],
  expiresAt
}
```

### 2. Client-Facing Page: `/quote/[token]/select-products`
**File:** `app/(public)/quote/[token]/select-products/page.tsx`

**Features:**
- ✅ Beautiful, modern UI with card-based item display
- ✅ Side-by-side Buy vs Consignment options for each item
- ✅ Visual selection with checkmarks
- ✅ Shows verified condition badges (Like New, Excellent, etc.)
- ✅ Displays serial numbers and inspector notes
- ✅ Expandable inspection details (accessories, condition checks)
- ✅ Progress tracking (shows how many items still need selection)
- ✅ Sticky bottom bar with "Continue" button
- ✅ Validates all items selected before continuing
- ✅ Stores selections in localStorage
- ✅ Redirects to details/accept page

**UI Components:**
- Inspection complete header with green success theme
- Instructional cards explaining Buy vs Consignment
- Item cards with:
  - Product name, brand, model
  - Condition badge with color coding
  - Serial number
  - Inspector notes
  - Product images (up to 2 shown)
  - Two selection buttons (Buy / Consignment)
  - Expandable details section
- Sticky continue button at bottom

### 3. Updated Details Submission
**Files:**
- `app/(public)/quote/[token]/details/page.tsx`
- `app/api/quote-confirmation/[token]/submit-details/route.ts`

**Changes:**
- Retrieves product selections from localStorage
- Includes `productSelections` in API submission
- Saves client choice (BUY/CONSIGNMENT) to each item
- Cleans up localStorage after submission

### 4. Database Schema Update
**File:** `prisma/schema.prisma`

**Added Field:**
```prisma
model IncomingGearItem {
  // ... existing fields ...
  clientSelection String? // "BUY" or "CONSIGNMENT"
}
```

**Migration:**
- Created: `20260205180803_add_client_selection`
- Applied: ✅ Successfully to database
- Prisma Client: ✅ Regenerated

## User Flow

### Complete Journey:
1. **Staff completes inspection** → Approves all items
2. **Staff sends final quote** → Clicks "Confirm" button
3. **Client receives email** → "Inspection Complete! Your Final Quote is Ready"
4. **Client clicks email link** → Opens `/quote/[token]/select-products`
5. **Client views inspected items:**
   - Sees verified condition, serial numbers
   - Views Buy price (instant cash) vs Consignment price (higher payout)
6. **Client selects option for each item:**
   - Clicks Buy or Consignment for each product
   - Must select for ALL items to continue
7. **Client clicks Continue** → Redirected to `/quote/[token]/accept`
8. **Client fills details form** → Provides personal & banking info
9. **Client submits** → Status changes to "AWAITING_PAYMENT"
10. **Staff receives notification** → Can see client's Buy/Consignment choices

## Key Features

### Pricing Display
- **Buy Option:** Lower price, immediate payment
- **Consignment:** Higher price, paid when item sells
- Both options clearly displayed side-by-side
- Uses override prices if set, otherwise auto-computed prices

### Selection Validation
- Cannot continue until all items have a selection
- Clear visual feedback (checkmark icons)
- Progress indicator shows remaining items

### Inspection Details
- Verified condition with color-coded badges
- Serial numbers for tracking
- Inspector notes
- Accessories checklist (present/missing)
- Condition check answers
- All expandable to avoid cluttering UI

### Mobile Responsive
- Grid layout adapts to mobile screens
- Touch-friendly selection buttons
- Sticky bottom bar stays visible
- Images resize appropriately

## Testing

### Test the Complete Flow:

1. **Start with an inspected purchase:**
   ```
   Navigate to: /dashboard/incoming
   Find purchase with status "INSPECTION_IN_PROGRESS"
   Ensure all items are APPROVED (green badges)
   ```

2. **Send final quote:**
   ```
   Click "Confirm - Send Final Quote to Client"
   Confirm in modal
   Check email sent (or dev logs)
   ```

3. **Client views quote:**
   ```
   Copy link from email or construct:
   https://dashboard.keysers.co.za/quote/[TOKEN]/select-products
   
   Or for testing:
   http://localhost:3000/quote/[TOKEN]/select-products
   ```

4. **Test selection flow:**
   - View all items with Buy/Consignment options
   - Try clicking Continue without selecting all (should block)
   - Select Buy for some, Consignment for others
   - Click Continue (should redirect to /accept then /details)

5. **Submit details:**
   - Fill personal info, address, banking
   - Upload ID document
   - Submit

6. **Verify in database:**
   ```sql
   SELECT id, clientName, clientSelection 
   FROM incoming_gear_items 
   WHERE sessionId = '[SESSION_ID]';
   ```

### Expected Results:
- ✅ Page loads with all verified items
- ✅ Buy and Consignment prices displayed
- ✅ Selection buttons work and show checkmarks
- ✅ Continue button disabled until all selected
- ✅ Selections stored in localStorage
- ✅ Details page receives selections
- ✅ Database updated with client choices
- ✅ Staff can see choices in dashboard

## Database Changes

### Migration Applied:
```sql
ALTER TABLE "incoming_gear_items" 
ADD COLUMN "clientSelection" TEXT;
```

### Query Client Choices:
```sql
-- View all client selections for a purchase
SELECT 
  i.clientName,
  i.clientSelection,
  v.verifiedCondition,
  p.buyPrice as "computedBuyPrice",
  p.consignPrice as "computedConsignPrice"
FROM incoming_gear_items i
LEFT JOIN verified_gear_items v ON v.incomingItemId = i.id
LEFT JOIN pricing_snapshots p ON p.verifiedItemId = v.id
WHERE i.sessionId = 'SESSION_ID';
```

## Email Configuration

The final quote email sends clients to:
```
${emailConfig.dashboardUrl}/quote/${token}/select-products
```

**Production URL:**
```
https://dashboard.keysers.co.za/quote/[TOKEN]/select-products
```

**Development URL:**
```
http://localhost:3000/quote/[TOKEN]/select-products
```

## Files Created/Modified

### New Files:
- ✅ `app/api/quote-confirmation/[token]/inspection/route.ts`
- ✅ `app/(public)/quote/[token]/select-products/page.tsx`
- ✅ `prisma/migrations/20260205180803_add_client_selection/migration.sql`

### Modified Files:
- ✅ `app/(public)/quote/[token]/details/page.tsx` (reads selections)
- ✅ `app/api/quote-confirmation/[token]/submit-details/route.ts` (saves selections)
- ✅ `prisma/schema.prisma` (added clientSelection field)

## Next Steps

### For Staff Dashboard:
Consider adding a view to display client selections:
```
When viewing "Awaiting Payment" purchases:
- Show which items client chose for Buy
- Show which items client chose for Consignment
- Calculate total payout based on selections
```

### For Client:
Consider adding a summary page before final submission:
```
Before submitting details, show:
- "You selected Buy for: X items (Total: R12,000)"
- "You selected Consignment for: Y items (Potential: R18,000)"
```

## Support

**Live URL:**
https://dashboard.keysers.co.za/quote/[TOKEN]/select-products

**Test with Token:**
Replace `[TOKEN]` with actual quote token from database:
```sql
SELECT quoteConfirmationToken 
FROM pending_purchases 
WHERE status = 'FINAL_QUOTE_SENT' 
LIMIT 1;
```

**Contact:**
- Email: admin@keysers.co.za
- For quote link issues, check token expiry (7 days)

---

**Implementation Complete** ✅  
**Database Migration Applied** ✅  
**Ready for Testing** ✅
