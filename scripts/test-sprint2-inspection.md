# Sprint 2: Inspection Integration Test Guide

## Overview
This guide will walk you through testing the complete Sprint 2 workflow: from gear received → start inspection → verify items → send final quote.

---

## Prerequisites

1. **Ensure Sprint 1 is complete:**
   - A purchase should exist with status `INSPECTION_IN_PROGRESS`
   - Gear should be marked as received (`gearReceivedAt` is set)
   - Tracking info should be present

2. **If you need to create test data:**
   ```bash
   # Run Sprint 1 test script to create a purchase
   ./scripts/test-sprint1-tracking.sh
   
   # Or manually create via webhook:
   # See test-quote-webhook.sh for example
   ```

---

## Test Workflow

### Step 1: View Incoming Gear Dashboard

1. Open: `http://localhost:3000/dashboard/incoming`
2. Find a client with status **"Inspection In Progress"**
3. Click to expand the client

**Expected UI:**
- ✅ Tracking info displayed (courier, tracking number, received date)
- ✅ Blue inspection card with "Ready for Inspection"
- ✅ **"Start Inspection"** button visible

---

### Step 2: Start Inspection

1. Click **"Start Inspection"** button
2. Confirm the dialog

**Expected Behavior:**
- ✅ Shows "Starting..." with loading spinner
- ✅ Creates `InspectionSession` in database
- ✅ Copies all `PendingItem`s to `IncomingGearItem`s
- ✅ Redirects to `/dashboard/inspections/[sessionId]`

**Verify in Database** (optional):
```bash
psql $DATABASE_URL -c "SELECT id, \"sessionName\", status FROM inspection_sessions ORDER BY \"createdAt\" DESC LIMIT 1;"
```

---

### Step 3: Verify Items (Inspection Page)

You should now be on the inspection page with a list of items.

For **each item**:

1. Click **"Start Verification"** or **"View Details"**
2. Go through the 4-step process:

   **Step 1: Identify**
   - Search for and select the correct product
   - E.g., search "Canon EOS R6" and select from dropdown

   **Step 2: Verify**
   - Set condition (e.g., "Excellent")
   - Enter serial number
   - Answer questions (charger? battery? strap?)
   - Check accessories present/missing
   - Add any notes

   **Step 3: Price**
   - Review auto-computed Buy + Consignment prices
   - (Optional) Override prices if needed with reason

   **Step 4: Approve**
   - Review summary
   - Click **"Approve & Lock"**

3. Repeat for all items

**Expected:**
- ✅ Each item can be verified independently
- ✅ Status changes from `UNVERIFIED` → `IN_PROGRESS` → `APPROVED`
- ✅ All data saved correctly

---

### Step 4: Return to Incoming Gear

1. Navigate back to: `http://localhost:3000/dashboard/incoming`
2. Find the same client and expand

**Expected UI:**
- ✅ Inspection card now shows **"Inspection In Progress"**
- ✅ Progress bar: "X/Y items approved" with percentage
- ✅ **"Continue Inspection"** button visible
- ✅ **"Send Final Quote"** button visible (only if all items approved)

**If not all items approved:**
- Progress bar shows partial completion (e.g., "2/3 items approved - 67%")
- **"Send Final Quote"** button NOT visible yet

**If all items approved:**
- Progress bar shows 100% with green color
- Message: "✅ All items approved! Ready to send final quote."
- **"Send Final Quote"** button visible and enabled

---

### Step 5: Send Final Quote

1. Ensure all items are approved (100% progress)
2. Click **"Send Final Quote"** button
3. Confirm the dialog

**Expected Behavior:**
- ✅ Shows "Sending..." with loading spinner
- ✅ API validates all items are approved
- ✅ Email sent to customer with "Open Quote" link
- ✅ Purchase status updates to `FINAL_QUOTE_SENT`
- ✅ `InspectionSession` status updates to `COMPLETED`
- ✅ UI updates to show "✅ Final Quote Sent" status

---

### Step 6: Check Email

1. Open email inbox: `king.riaan@gmail.com` (or your test email)
2. Find email: **"Your Final Quote from Keysers - Ready to Review"**

**Expected Email Content:**
- ✅ Subject line correct
- ✅ "Inspection Complete" message
- ✅ Item count shown (e.g., "3 items")
- ✅ Inspection notes included (if any)
- ✅ Blue **"Open Your Final Quote"** button
- ✅ Link format: `/quote/[token]/select-products`
- ✅ Timeline of next steps
- ✅ Expiry warning (7 days)

---

### Step 7: Customer Opens Quote (Bonus)

1. Click the **"Open Your Final Quote"** button in email
2. Should open: `/quote/[token]/select-products`

**Expected (Sprint 3 - Not Yet Implemented):**
- Currently, this page doesn't exist yet
- You'll see a 404 or blank page
- This is normal! Sprint 3 will build the product selection page

---

## API Testing (Optional)

### Test Start Inspection API

```bash
# Get a purchase ID
PURCHASE_ID="clxyz..."

# Start inspection
curl -X POST http://localhost:3000/api/incoming-gear/$PURCHASE_ID/start-inspection \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "sessionId": "clxyz...",
  "sessionName": "Quote from Test Client - 2/4/2026",
  "itemCount": 3,
  "redirectUrl": "/dashboard/inspections/clxyz..."
}
```

### Test Send Final Quote API

```bash
# Send final quote
curl -X POST http://localhost:3000/api/incoming-gear/$PURCHASE_ID/send-final-quote \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "emailSent": true,
  "message": "Final quote sent successfully",
  "sentTo": "customer@example.com",
  "itemCount": 3,
  "quoteUrl": "https://dashboard.keysers.co.za/quote/abc123/select-products"
}
```

---

## Troubleshooting

### "No inspection session found"
- **Cause:** Inspection not started yet
- **Fix:** Click "Start Inspection" button first

### "Only X of Y items approved"
- **Cause:** Not all items have been approved in inspection
- **Fix:** Go to inspection page and approve remaining items

### "Customer email is required"
- **Cause:** Purchase doesn't have customer email
- **Fix:** Add email manually in database or webhook

### "Final quote has already been sent"
- **Cause:** Quote already sent (check `finalQuoteSentAt`)
- **Fix:** This is expected behavior - can't send twice

### Inspection button not showing
- **Cause:** Status not `INSPECTION_IN_PROGRESS` or gear not received
- **Fix:** Mark gear as received first (Sprint 1)

---

## Success Criteria

✅ **Sprint 2 is complete if:**
- [x] Start Inspection button appears and works
- [x] Inspection session created correctly
- [x] Can verify all items in inspection
- [x] Inspection progress tracked in Incoming Gear
- [x] Send Final Quote button appears when all approved
- [x] Final quote email sent successfully
- [x] Email contains correct "Open Quote" link
- [x] Status updates to `FINAL_QUOTE_SENT`
- [x] Customer can click email link (even if page not built yet)

---

## Next Steps: Sprint 3

Once Sprint 2 is verified, proceed to Sprint 3:
- **Sprint 3: Product Selection (Buy vs Consignment)**
- Build `/quote/[token]/select-products` page
- Allow client to choose Buy or Consignment for each item
- Show both prices side-by-side
- Save selections and proceed to personal details

---

**Test Date:** _________  
**Tester:** _________  
**Result:** ☐ Pass  ☐ Fail  ☐ Needs Fixes  
**Notes:** _________
