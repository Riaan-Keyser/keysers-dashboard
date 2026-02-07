# Inspection Workflow Enhancements - Testing Guide

## Overview

This guide covers the new features added to the Incoming Gear inspection workflow:

1. **"Not interested in purchasing"** - Mark items as declined with reasons, automatically zeroing prices
2. **"Mark for repair"** - Flag items for repair that will appear in Repairs tab after payment completion
3. **Repairs tab notification badge** - Visual indicator for items requiring repair

## Database Changes

### Prisma Schema Updates

The following fields were added to the `VerifiedGearItem` model:

```prisma
// Purchase interest tracking
notInterested       Boolean                @default(false)
notInterestedReason NotInterestedReason?

// Repair tracking
requiresRepair Boolean @default(false)
```

New enum for decline reasons:

```prisma
enum NotInterestedReason {
  DAMAGE                  // Product has damage
  UNECONOMICAL_TO_REPAIR  // Too expensive to repair
  MOLD_IN_PRODUCT         // Mold present in product
}
```

## Test Scenarios

### Scenario 1: Mark Item as "Not Interested in Purchasing"

#### Steps:
1. Navigate to **Dashboard → Incoming Gear**
2. Click **"Start Inspection"** on a pending purchase
3. Complete the inspection workflow up to **Step 3: Pricing**
4. In the **"Purchase Decision & Repair Status"** section:
   - Check ✅ **"Not interested in purchasing"**
   - Select a reason from dropdown:
     - Damage
     - Uneconomical to repair
     - Mold in product
5. Click **"Save Purchase Decision"**

#### Expected Results:
- ✅ Success message appears
- ✅ All pricing fields show **R 0**
- ✅ Final Prices card changes to **red background** with heading: "🚫 Not Purchasing - All Prices Set to R 0"
- ✅ Both Buy Price and Consignment Price show **R 0** with red "Not Interested" badge
- ✅ Price Override section is **hidden** (only visible to admins when not declined)
- ✅ Page refreshes and maintains the state

#### Verify in Database:
```sql
SELECT 
  id, 
  notInterested, 
  notInterestedReason, 
  requiresRepair 
FROM verified_gear_items 
WHERE id = '<item_id>';
```

Expected: `notInterested = true`, `notInterestedReason = 'DAMAGE'` (or selected reason)

---

### Scenario 2: Mark Item for Repair

#### Steps:
1. Navigate to **Dashboard → Incoming Gear**
2. Click **"Start Inspection"** on a pending purchase
3. Complete the inspection workflow up to **Step 3: Pricing**
4. In the **"Purchase Decision & Repair Status"** section:
   - Check ✅ **"Mark for repair"**
5. Click **"Save Purchase Decision"**

#### Expected Results:
- ✅ Success message appears
- ✅ Blue info box appears: "ℹ️ Item will appear in Repairs tab once payment is marked as completed"
- ✅ Prices remain normal (not zeroed)
- ✅ Page refreshes and maintains the state

#### Verify in Database:
```sql
SELECT 
  id, 
  notInterested, 
  requiresRepair 
FROM verified_gear_items 
WHERE id = '<item_id>';
```

Expected: `requiresRepair = true`

---

### Scenario 3: Combined - Not Interested + Mark for Repair

#### Steps:
1. Check both **"Not interested in purchasing"** AND **"Mark for repair"**
2. Select a decline reason
3. Click **"Save Purchase Decision"**

#### Expected Results:
- ✅ Both flags are saved independently
- ✅ Prices are zeroed (notInterested takes precedence)
- ✅ Item will still appear in Repairs after payment (if needed)

---

### Scenario 4: Unmarking "Not Interested" (Re-enable Pricing)

#### Steps:
1. On an item marked as "Not interested"
2. Uncheck ✅ **"Not interested in purchasing"**
3. Click **"Save Purchase Decision"**

#### Expected Results:
- ✅ Prices are **recalculated automatically** based on condition and accessories
- ✅ Final Prices card returns to **green background**
- ✅ Price Override section becomes **visible again** (for admins)

#### API Behavior:
The system automatically:
- Recomputes pricing using `computePricing()` function
- Applies condition multiplier
- Subtracts accessory penalties
- Updates `PricingSnapshot` in database

---

### Scenario 5: Payment Completion → Items Appear in Repairs

#### Prerequisites:
- At least one inspected item marked with `requiresRepair = true`
- Purchase moved to **Awaiting Payment** status

#### Steps:
1. Navigate to **Dashboard → Awaiting Payment**
2. Find the purchase with items marked for repair
3. Click **"Mark as Paid"**
4. Navigate to **Dashboard → Repairs**

#### Expected Results:
- ✅ Purchase status changes to `PAYMENT_RECEIVED`
- ✅ **Repairs tab** in sidebar shows **red notification badge** with count
- ✅ Repairs page shows **"Requiring Repair (Paid)"** stat with count
- ✅ New tab appears: **"Requiring Repair"** with badge count
- ✅ Items are listed in the "Requiring Repair" table with:
   - Product name, brand, model
   - Serial number
   - Customer name
   - Vendor/Client name
   - Purchase ID (truncated)
   - Badge: "Awaiting Repair Setup"

#### Verify API Response:
```bash
curl http://localhost:3000/api/repairs
```

Expected response structure:
```json
{
  "repairs": [...],
  "itemsRequiringRepair": [
    {
      "id": "...",
      "clientName": "...",
      "verifiedItem": {
        "product": { "id": "...", "name": "...", "brand": "...", "model": "..." },
        "serialNumber": "..."
      },
      "session": {
        "purchase": { "id": "...", "customerName": "..." },
        "vendor": { "id": "...", "name": "..." }
      }
    }
  ]
}
```

---

### Scenario 6: Repairs Tab Navigation

#### Steps:
1. Navigate to **Dashboard → Repairs**
2. Observe the two tabs:
   - **"Active Repairs"** - Shows regular repair logs
   - **"Requiring Repair"** - Shows items needing repair setup

#### Expected Results:
- ✅ Tab switching works correctly
- ✅ Badge count appears on "Requiring Repair" tab when items > 0
- ✅ Filters (search, status) only appear for "Active Repairs" tab
- ✅ Empty state shows helpful message when no items require repair

---

### Scenario 7: Sidebar Notification Badge

#### Steps:
1. Ensure at least one item marked for repair has payment completed
2. Observe the sidebar

#### Expected Results:
- ✅ **Repairs** menu item shows **red badge** with count
- ✅ Badge appears similar to "Awaiting Payment" badge
- ✅ Badge updates every **30 seconds** automatically
- ✅ Badge disappears when count reaches 0

---

### Scenario 8: Admin Price Override with "Not Interested"

#### Steps (Admin user only):
1. Mark item as "Not interested in purchasing"
2. Observe the **Price Override** section

#### Expected Results:
- ✅ Price Override section is **hidden** when `notInterested = true`
- ✅ Override is only visible when item is NOT declined
- ✅ This prevents confusion about overriding prices on declined items

---

### Scenario 9: Full Workflow End-to-End

#### Complete Flow:
1. **Inspection** → Mark item with `requiresRepair = true`
2. **Approve** → Complete all inspection steps
3. **Send Final Quote** → Email sent to client
4. **Client Submits Details** → Purchase moves to Awaiting Payment
5. **Mark as Paid** → Payment completed
6. **Repairs Tab** → Item appears with badge notification

#### Expected Console Logs:
```
✅ Purchase [id] marked as paid by [user]
   ⚠️  1 item(s) requiring repair now available in Repairs tab
```

---

## Edge Cases to Test

### Edge Case 1: No Reason Selected for "Not Interested"
- **Test**: Try to save without selecting a reason
- **Expected**: Save button is **disabled** until reason is selected

### Edge Case 2: Multiple Items in Same Purchase
- **Test**: Mark some items for repair, others as not interested
- **Expected**: Each item's flags are saved independently

### Edge Case 3: Payment Before Marking for Repair
- **Test**: Mark item for repair AFTER payment is already completed
- **Expected**: Item immediately appears in Repairs tab (if payment status is already `PAYMENT_RECEIVED`)

### Edge Case 4: Reopening Approved Items
- **Test**: Admin reopens an approved item marked for repair
- **Expected**: Flags are preserved during reopen

---

## API Endpoints Updated

### 1. `PATCH /api/inspections/items/[itemId]`

New action: `update_purchase_decision`

**Request Body:**
```json
{
  "action": "update_purchase_decision",
  "notInterested": true,
  "notInterestedReason": "DAMAGE",
  "requiresRepair": true
}
```

**Behavior:**
- Validates that `notInterestedReason` is provided when `notInterested = true`
- Updates `VerifiedGearItem` with flags
- Zeros out `PricingSnapshot` prices when `notInterested = true`
- Recalculates prices when unmarking `notInterested`
- Logs activity in `ActivityLog`

---

### 2. `POST /api/incoming-gear/[id]/mark-paid`

**Updated Behavior:**
- Fetches purchase with inspection session
- Counts items with `requiresRepair = true`
- Logs count in activity details
- Returns `itemsRequiringRepair` count in response

**Response:**
```json
{
  "success": true,
  "message": "Purchase marked as paid",
  "itemsRequiringRepair": 2
}
```

---

### 3. `GET /api/repairs`

**Updated Response:**
```json
{
  "repairs": [...],
  "itemsRequiringRepair": [...]
}
```

**Query Logic:**
```sql
WHERE verifiedItem.requiresRepair = true
AND session.purchase.status = 'PAYMENT_RECEIVED'
```

---

## Visual Indicators Summary

| Feature | Visual Indicator | Location |
|---------|------------------|----------|
| Not Interested Selected | Red background, R 0 prices | Step 3: Pricing |
| Not Interested Badge | Red "Not Interested" badge | Final Prices card |
| Repair Flag Active | Blue info box | Purchase Decision section |
| Items Requiring Repair | Red badge with count | Sidebar Repairs menu |
| Items Requiring Repair | Red stat card | Repairs page stats |
| Requiring Repair Tab | Tab badge with count | Repairs page tabs |
| Price Override Hidden | Section not rendered | When notInterested = true |

---

## Testing Checklist

- [ ] Mark item as "Not interested" with each reason option
- [ ] Verify prices zero out correctly
- [ ] Mark item for repair
- [ ] Verify repair flag persists through page refresh
- [ ] Complete payment on item with requiresRepair = true
- [ ] Verify item appears in Repairs tab
- [ ] Verify sidebar badge appears with correct count
- [ ] Unmark "Not interested" and verify prices recalculate
- [ ] Test with admin user (Price Override visibility)
- [ ] Test with non-admin user (no override access)
- [ ] Verify badge updates automatically (wait 30s)
- [ ] Test with multiple items in same purchase
- [ ] Test empty state in Repairs tab
- [ ] Verify tab switching in Repairs page
- [ ] Check console logs for repair count on mark-paid

---

## Database Verification Queries

### Check Item Status:
```sql
SELECT 
  vgi.id,
  vgi.notInterested,
  vgi.notInterestedReason,
  vgi.requiresRepair,
  ps.finalBuyPrice,
  ps.finalConsignPrice,
  p.name as product_name
FROM verified_gear_items vgi
JOIN pricing_snapshots ps ON ps.verifiedItemId = vgi.id
JOIN products p ON p.id = vgi.productId;
```

### Find Items Requiring Repair (Paid):
```sql
SELECT 
  igi.id,
  igi.clientName,
  vgi.requiresRepair,
  pp.status,
  pp.customerName,
  v.name as vendor_name
FROM incoming_gear_items igi
JOIN verified_gear_items vgi ON vgi.incomingItemId = igi.id
JOIN inspection_sessions ins ON ins.id = igi.sessionId
JOIN pending_purchases pp ON pp.id = ins.purchaseId
JOIN vendors v ON v.id = ins.vendorId
WHERE vgi.requiresRepair = true
AND pp.status = 'PAYMENT_RECEIVED';
```

---

## Troubleshooting

### Issue: Prices Not Zeroing Out
- **Check**: Is `notInterestedReason` selected?
- **Check**: Did you click "Save Purchase Decision"?
- **Check**: Database query to verify `notInterested = true`

### Issue: Item Not Appearing in Repairs
- **Check**: Is `requiresRepair = true` in database?
- **Check**: Is purchase status `PAYMENT_RECEIVED`?
- **Check**: API response from `/api/repairs` includes `itemsRequiringRepair` array

### Issue: Badge Not Showing
- **Check**: Sidebar is fetching from `/api/repairs` correctly
- **Check**: Network tab for API call response
- **Check**: Wait 30 seconds for auto-refresh

### Issue: Prices Not Recalculating After Unmarking
- **Check**: API logs show pricing recalculation
- **Check**: `PricingSnapshot` updated in database
- **Check**: No price override is active (overrides take precedence)

---

## Success Criteria

✅ All tests pass  
✅ No console errors  
✅ No linter warnings  
✅ Database constraints satisfied  
✅ UI responds correctly to all interactions  
✅ Badges update automatically  
✅ Prices calculate correctly in all scenarios  
✅ Activity logs created for all actions  

---

## Notes

- **Not Interested** and **Mark for Repair** are independent flags
- Both can be active on the same item
- Prices are zeroed ONLY when `notInterested = true`
- Items appear in Repairs ONLY after payment completion
- Badge counts refresh every 30 seconds automatically
- Admin-only features (Price Override) are properly hidden
- All changes are logged in `ActivityLog` for audit trail

---

**Implementation Date**: 2026-02-05  
**Author**: AI Assistant  
**Version**: 1.0
