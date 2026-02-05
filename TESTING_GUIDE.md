# Testing Guide - Quote Submission Flow

## Quick Reset & Test

### 1. Reset Test Data
```bash
npx tsx scripts/reset-test-quote.ts
```

This will:
- ✅ Delete existing client details
- ✅ Reset purchase status to `FINAL_QUOTE_SENT`
- ✅ Clear all product selections
- ✅ Reset `clientAcceptedAt` to null

### 2. Start Testing Flow
```
http://localhost:3000/quote/c2b0f5ef7e118fc69eab33d718e97e4e033f809afee1cf9cd1882f3f949cbff5/select-products
```

### 3. Check Current Status
```bash
npx tsx scripts/check-quote-token.ts
```

## Common Issues & Solutions

### Issue: "Details already submitted" error

**Symptom:** Form submission fails with empty error `{}`

**Cause:** Client details already exist in database from previous test

**Solution:**
```bash
npx tsx scripts/reset-test-quote.ts
```

Then **refresh your browser** before trying again.

### Issue: "Submit failed" popup

**Check browser console** (F12 → Console tab) for detailed error:

1. **"Details already submitted"** → Run reset script
2. **"Missing required field"** → Check all form fields are filled
3. **"Invalid phone number"** → Use format: +27723926372
4. **"Invalid or expired quote link"** → Token might be invalid

### Issue: Status not changing to AWAITING_PAYMENT

**Check:**
1. Does clientDetails exist? Run `check-quote-token.ts`
2. Did the API return success? Check browser console
3. Is the server running? Check terminal

### Issue: Admin email not sent

**Check:**
1. Is `RESEND_API_KEY` set in `.env`?
2. If not, you'll see: `📧 [DEV MODE] Would send awaiting payment email...`
3. This is normal in development - email won't actually send

## Test Data Examples

### Personal Information
- Full Name: `Test`
- Surname: `User`
- ID Number: `8910105020087`
- Email: `test@example.com`
- Phone: `+27723926372`

### Address
- Physical Address: `65 Tennant Street`
- Street: `Windsor Park, Kraaifontein`
- City: `Cape Town`
- Province: `Western Cape`
- Postal Code: `7570`

### Banking
- Bank Name: `FNB`
- Account Type: `Cheque`
- Account Number: `1234567890`
- Branch Code: `250566`
- Account Holder: `Test User`

## Monitoring Server Logs

### Terminal Logs
Check the terminal where `npm run dev` is running. You'll see:

**Product Selection:**
```
📝 Submit details - Token: c2b0f5ef7e118fc69e...
📝 Body keys: [ 'fullName', 'surname', 'email', ... ]
✅ Purchase found: cml95fjc60000v5i1p3hzx3yg Status: FINAL_QUOTE_SENT
```

**Validation:**
```
✅ All required fields present
✅ Identity validated
✅ Phone validated
```

**Database Operations:**
```
💾 Creating client details record...
✅ Client details created: cml9xxx...
💾 Saving product selections...
✅ 3 product selections saved
💾 Updating purchase status to AWAITING_PAYMENT...
✅ Purchase status updated
🔒 Invalidating token...
✅ Token invalidated
```

**Email Notification:**
```
📧 Sending admin notification...
📧 [DEV MODE] Would send awaiting payment email to admin: admin@keysers.co.za
   Customer: Test User
   Amount: R22229
   Purchase ID: cml95fjc60000v5i1p3hzx3yg
✅ Admin notification sent
```

**Success:**
```
🎉 Submission complete!
```

### Browser Console
Check browser DevTools (F12 → Console):

**Submission:**
```
📝 Submitting with selections: {...}
📝 Form data preview: {...}
✅ Submit successful: { success: true, message: "..." }
```

**Or Error:**
```
❌ Submit failed: { error: "Details already submitted" }
   Response status: 400
   Error message: Details already submitted
```

## Expected Flow After Successful Submission

1. ✅ Client sees: "Thank You! Keysers has received your paperwork!"
2. ✅ Dashboard: Purchase moves from "Incoming Gear" to "Awaiting Payment"
3. ✅ Sidebar: Red badge "1" appears on "Awaiting Payment"
4. ✅ Admin email notification sent (or DEV MODE log)
5. ✅ Token is invalidated (can't be used again)

## Debugging Commands

```bash
# Check purchase and inspection data
npx tsx scripts/check-quote-token.ts

# Reset for retesting
npx tsx scripts/reset-test-quote.ts

# View server process
ps aux | grep node

# Kill and restart server if needed
pkill -f "next dev"
npm run dev
```

## File Upload Testing

**Note:** File upload is not yet fully implemented. The form expects:
- `proofOfIdUrl` - **REQUIRED** (currently set to null)
- `proofOfAddressUrl` - Optional
- `bankConfirmationUrl` - Optional

For now, the form will submit without actual files. File upload will be implemented in a future phase.

## Database Schema Reference

### PendingPurchase Statuses:
- `QUOTE_REQUESTED` - Initial creation
- `FINAL_QUOTE_SENT` - After inspection complete
- `AWAITING_PAYMENT` - After client submits details ← **This is what we want**
- `PAYMENT_RECEIVED` - After admin marks as paid
- `COMPLETED` - Final state

### IncomingGearItem clientSelection:
- `null` - Not selected yet
- `"BUY"` - Client chose instant buy option
- `"CONSIGNMENT"` - Client chose consignment option

## Troubleshooting Checklist

Before asking for help, check:

- [ ] Server is running (`npm run dev`)
- [ ] Database is accessible (run `check-quote-token.ts`)
- [ ] Test data has been reset (`reset-test-quote.ts`)
- [ ] Browser has been refreshed after reset
- [ ] Browser console shows no JavaScript errors
- [ ] Server terminal shows no errors
- [ ] All form fields are filled correctly
- [ ] Terms checkboxes are checked (Step 5)

## Known Limitations

1. **File Upload:** Not yet implemented - will be added in future phase
2. **PDF Generation:** Agreements not yet generated - will be added
3. **Email in Dev Mode:** Requires `RESEND_API_KEY` to actually send
4. **Single Test Purchase:** Only one test purchase configured currently

## Next Steps After Testing

Once testing is complete:

1. **Add ClientDetails schema fields:**
   - `acceptedBuyTerms`
   - `acceptedConsignmentTerms`
   - `consignmentEndDate`
   - `termsAcceptedAt`

2. **Implement file upload:**
   - S3/Cloud storage integration
   - File validation
   - Image preview

3. **Generate PDFs:**
   - Consignment Agreement with signatures
   - Supplier's Invoice
   - Annexure A

4. **Display on Awaiting Payment page:**
   - Client selections (Buy/Consignment)
   - Terms acceptance dates
   - Uploaded documents

5. **Consignment tracking:**
   - Expiry date monitoring
   - Reminder emails
   - Admin dashboard views

---

**Last Updated:** 2026-02-05
**Status:** ✅ Ready for Testing
