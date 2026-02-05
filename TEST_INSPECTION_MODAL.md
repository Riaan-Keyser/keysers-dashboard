# Testing the New Inspection Modal

## Prerequisites
1. Server is running: `npm run dev`
2. You have a test purchase in "Incoming Gear" tab
3. The purchase has status "PENDING_REVIEW" or "INSPECTION_IN_PROGRESS"

## Quick Test Steps

### 1. Navigate to Incoming Gear Tab
- Go to Dashboard → Incoming Gear
- Find a purchase with items to inspect

### 2. Click "Mark as Received" (if not already done)
- This creates the inspection session
- Status changes to "INSPECTION_IN_PROGRESS"

### 3. Click "Inspect" Button on Any Item
✅ **Expected**: Modal opens in-page (not new tab)

### 4. Test Product Identity Confirmation
- Modal shows original product name from client
- Click the product dropdown
- Type to search (e.g., "Canon", "Sony", "Nikon")
- Select a product
✅ **Expected**: Pricing panel appears below with Buy/Consignment ranges

### 5. Test Condition Selector
- Click the "Condition" dropdown
- Select any condition (e.g., "Excellent")
✅ **Expected**: Dropdown shows selected value

### 6. Test Serial Number (if Camera/Lens/Drone)
- Enter a test serial number (e.g., "SN12345678")
✅ **Expected**: Value persists in field

### 7. Test Included Items Checkboxes
- Check some boxes (e.g., "Lens hood included?")
- Uncheck others
✅ **Expected**: Checkboxes toggle correctly

### 8. Test Condition Checks (Yes/No/Not Tested)
- Click "Yes" on one question
- Click "No" on another
- Click "Not Tested" on a third
✅ **Expected**: Buttons highlight when selected

### 9. Test Notes
- Type some text in the notes textarea
✅ **Expected**: Text appears in field

### 10. Test Validation
- Clear the condition dropdown (select nothing)
- Try to click "Save Inspection"
✅ **Expected**: Warning message appears

### 11. Test Save
- Fill all required fields (product + condition)
- Click "Save Inspection"
✅ **Expected**: 
- Modal closes
- Item row now shows green "✓ Inspected" badge
- "Inspect" button changes to "Re-inspect" and turns green

### 12. Test Re-inspect
- Click "Re-inspect" button
✅ **Expected**: 
- Modal opens again
- All previously saved data is pre-filled

### 13. Test Progress Bar
- Inspect all items in the purchase one by one
✅ **Expected**: 
- Progress bar updates (e.g., "2/3 items inspected")
- Percentage increases

### 14. Test "Send Final Quote" Button
- After inspecting all items
✅ **Expected**: 
- "Send Final Quote" button appears
- Button is green
- Clicking it sends email to client

## Common Issues & Fixes

### Modal Doesn't Open
- Check browser console for errors (F12)
- Verify server is running (`npm run dev`)
- Check that `InspectItemModal` component imported correctly

### Product Dropdown Empty
- Verify `/api/products` endpoint works
- Check that products exist in database
- Run: `npx prisma studio` to verify Product table

### Pricing Not Showing
- Check that selected Product has `buyLow`, `buyHigh`, `consignLow`, `consignHigh` values
- Verify Product record in database

### "Save" Button Does Nothing
- Check browser console for API errors
- Verify required fields filled (product + condition)
- Check that inspection API endpoint exists: `/api/incoming-gear/pending-items/[itemId]/inspection`

### "Inspected" Badge Not Showing
- Refresh the page manually
- Check that API returned `inspectionStatus: "VERIFIED"`
- Verify `isItemInspected()` function logic

### "Send Final Quote" Button Not Appearing
- Ensure ALL items are inspected (not just some)
- Check that `finalQuoteSentAt` is null (not already sent)
- Verify customer has an email address

## Database Checks

### Verify InspectionSession Created
```sql
SELECT * FROM inspection_sessions ORDER BY created_at DESC LIMIT 1;
```

### Verify IncomingGearItem Created
```sql
SELECT * FROM incoming_gear_items WHERE session_id = 'SESSION_ID';
```

### Verify VerifiedGearItem Created
```sql
SELECT * FROM verified_gear_items ORDER BY created_at DESC LIMIT 1;
```

### Verify Accessories Saved
```sql
SELECT * FROM verified_accessories WHERE verified_item_id = 'VERIFIED_ITEM_ID';
```

### Verify Answers Saved
```sql
SELECT * FROM verified_answers WHERE verified_item_id = 'VERIFIED_ITEM_ID';
```

## API Endpoint Tests

### GET Inspection Data
```bash
curl -X GET http://localhost:3000/api/incoming-gear/pending-items/ITEM_ID/inspection \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### PUT Inspection Data
```bash
curl -X PUT http://localhost:3000/api/incoming-gear/pending-items/ITEM_ID/inspection \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "productId": "PRODUCT_ID",
    "condition": "EXCELLENT",
    "serialNumber": "SN12345",
    "includedItems": {
      "lens_hood": true,
      "front_cap": true
    },
    "conditionChecks": {
      "dust": "NO",
      "scratches": "NO"
    },
    "notes": "Test inspection"
  }'
```

## Success Criteria

✅ All tests above pass
✅ No console errors
✅ Data persists after page refresh
✅ Modal UX is smooth (no flickering, no layout shifts)
✅ "Send Final Quote" button appears when all items inspected
✅ Audit logs created for inspection actions

## Next Steps After Testing

Once testing is complete and working:
1. Test with real client data
2. Implement remaining features:
   - Product Selection Page (Buy vs Consignment choice)
   - Consignment Agreement Page
   - "Let's Get Paid" final confirmation flow
3. Add price override UI (if needed)
4. Consider adding direct foreign key between PendingItem and IncomingGearItem
