# Actual Agreement Documents - Field Mapping

**Date:** 2026-02-05
**Status:** ✅ Complete - Using Actual Legal Text

## Documents Analyzed

1. **Consignment Agreement.pdf** - 10 pages
2. **Supplier's Invoice.pdf** - 4 pages

## Consignment Agreement - Fields Mapping

### Information Required from Consignor (Client)

| Document Field | Form Step | Field Name | Status |
|---|---|---|---|
| Consignor Name | Step 1 | `fullName` + `surname` | ✅ Collected |
| Consignor Location/Address | Step 2 | `physicalAddress`, `physicalCity`, etc. | ✅ Collected |
| Telephone | Step 1 | `phone` | ✅ Collected |
| Email | Step 1 | `email` | ✅ Collected |
| **Timeframe Date (Section 6)** | **Step 5** | **`consignmentEndDate`** | ✅ **New Field** |
| Address for Legal Notices (Section 11) | Step 2 | `physicalAddress` (reused) | ✅ Collected |
| Signature (Section 12) | Step 5 | Electronic checkbox | ✅ Implemented |
| Date | Auto | `new Date()` | ✅ Generated |

### Agreement Terms Included

All 12 sections of the Consignment Agreement are displayed:

1. ✅ **Right to Sell** - Exclusive right granted
2. ✅ **Minimum Price** - From inspection (Annexure A)
3. ✅ **Consignment Fee** - Difference between minimum and sale price, payment within 7 days
4. ✅ **Insurance** - Consignee maintains coverage
5. ✅ **Location of Items** - 65 Tennant Street, Windsor Park, Kraaifontein, 7570
6. ✅ **Timeframe** - Client selects end date
7. ✅ **Consignor Representation** - Holds title, items free from defects
8. ✅ **Expenses** - Consignee bears shipping
9. ✅ **No Modification Unless in Writing**
10. ✅ **Applicable Law** - South African law
11. ✅ **Notice and Domicilia** - Addresses for legal notices
12. ✅ **Breach** - 14 days to remedy

### Consignee (Keysers) Information - Pre-filled

- Name: **Riaan Keyser**
- Address: **65 Tennant Street, Windsor Park, Kraaifontein, 7570**

### Annexure A - Auto-populated

Will be generated from inspection data:
- Description (Product names)
- Serial Numbers
- Minimum Prices (Consignment prices from inspection)

## Supplier's Invoice - Fields Mapping

### Information Required from Supplier (Client)

| Document Field | Form Step | Field Name | Status |
|---|---|---|---|
| Name & Surname | Step 1 | `fullName` + `surname` | ✅ Collected |
| ID No. | Step 1 | `idNumber` or `passportNumber` | ✅ Collected |
| Contact No. | Step 1 | `phone` | ✅ Collected |
| E-Mail | Step 1 | `email` | ✅ Collected |
| Address | Step 2 | `physicalAddress`, etc. | ✅ Collected |
| Date | Auto | `new Date()` | ✅ Generated |
| **Account Name** | **Step 3** | **`accountHolderName`** | ✅ Collected |
| **Bank** | **Step 3** | **`bankName`** | ✅ Collected |
| **Account No.** | **Step 3** | **`accountNumber`** | ✅ Collected |
| **Branch Code** | **Step 3** | **`branchCode`** | ✅ Collected |
| **Account Type** | **Step 3** | **`accountType`** | ✅ Collected |
| Description | Auto | From inspection items | ✅ Will be filled |
| Price | Auto | Buy prices from inspection | ✅ Will be filled |
| Total | Auto | Sum of buy prices | ✅ Will be calculated |
| Signature | Step 5 | Electronic checkbox | ✅ Implemented |

### Keysers Information - Pre-filled

- Company: **Keysers Camera Equipment**
- Reg. No.: **2007/200275/23**
- VAT No.: **4450277977**
- Address: **P.O. Box 459, Cape Gate, Brackenfell, Cape Town, 7560**
- Email: **Admin@Keysers.co.za**
- Phone: **0723926372**

## Document Instructions Compliance

### Consignment Agreement Instructions ✅

- [x] Complete the ENTIRE document → All fields collected
- [x] Initial EACH Page → Not applicable (electronic)
- [x] No. 6 Timeframe - Put in a date → **Step 5: Date selector**
- [x] No. 11 NOTICE AND DOMICILIA - Put in your address → Uses physical address from Step 2
- [x] No. 12 BREACH - Put in full name and sign → Electronic signature with checkbox
- [x] Annexure A - Leave blank → Will be auto-filled by system

### Supplier's Invoice Instructions ✅

- [x] Complete the ENTIRE document → All fields collected
- [x] Double check Banking Details → Step 3 collects all banking info
- [x] Leave Description area blank → Will be auto-filled from inspection
- [x] Sign the document → Electronic signature checkbox
- [x] Return with copy of ID or Passport → Step 4 document upload

## Additional Requirements

### SARS VAT 264 Document
**Note:** This was mentioned in the PDF but not provided. 
- May need to be added as separate step if applicable
- Would require signature on last page only

### Document Uploads (Step 4) ✅

Required:
- [x] Proof of ID (SA ID or Passport) - **REQUIRED**

Optional but recommended:
- [x] Proof of Address
- [x] Bank Confirmation Letter

## Legal Compliance

### POPIA (Protection of Personal Information Act) ✅
- Privacy notice displayed
- Purpose of data collection stated
- No sharing with third parties without consent

### ECTA (Electronic Communications and Transactions Act) ✅
- Electronic signature explanation provided
- Legal equivalence to handwritten signature stated
- Consent obtained via checkbox

### South African Law ✅
- Both agreements governed by SA law
- Jurisdiction: SA courts
- Currency: South African Rand (R)

## Form Flow Summary

### For Consignment Items:

**Steps 1-4:** Collect all personal, address, banking, and document info

**Step 5: Consignment Agreement**
1. Display full agreement (all 12 sections)
2. **Require consignment end date selection** (Section 6)
3. Show date in acceptance text with full legal language
4. Require checkbox acceptance
5. Submit

**Backend will generate:**
- Signed Consignment Agreement PDF
- Annexure A with item details
- Store consignment end date
- Track for expiry notifications

### For Buy Items:

**Steps 1-4:** Collect all personal, address, banking, and document info

**Step 5: Supplier's Invoice Agreement**
1. Display purchase terms (9 sections)
2. Confirm banking details correct
3. Require checkbox acceptance
4. Submit

**Backend will generate:**
- Supplier's Invoice PDF with all collected details
- Item descriptions from inspection
- Prices and total
- Store for payment processing (48 hours)

### For Mixed (Both):

**Steps 1-4:** Collect all info

**Step 5: BOTH Agreements**
1. Consignment Agreement (with date selector)
2. Purchase Agreement
3. Must accept BOTH
4. Submit

**Backend will generate:**
- BOTH documents
- Separate tracking for consignment vs buy items

## Database Storage Recommendations

### Add to `ClientDetails` model:

```prisma
model ClientDetails {
  // ... existing fields ...
  
  // Agreement acceptance
  acceptedBuyTerms         Boolean?
  acceptedConsignmentTerms Boolean?
  buyTermsAcceptedAt       DateTime?
  consignmentTermsAcceptedAt DateTime?
  
  // Consignment specific
  consignmentEndDate       DateTime?  // From Section 6 of agreement
  
  // Document tracking
  consignmentAgreementPdfUrl String?  // Generated PDF
  supplierInvoicePdfUrl     String?   // Generated PDF
  annexureAPdfUrl           String?   // Generated Annexure A
  
  // Compliance
  electronicSignatureIp     String?   // IP address of signature
  electronicSignatureDate   DateTime? // Timestamp of signature
}
```

### Add to `IncomingGearItem` model:

Already added:
```prisma
clientSelection String? // "BUY" or "CONSIGNMENT"
```

## Next Implementation Steps

### 1. PDF Generation (High Priority)
- Generate Consignment Agreement PDF with client data
- Generate Annexure A with item details
- Generate Supplier's Invoice PDF
- Store URLs in database

### 2. Email Notifications
- Send copy of agreement(s) to client after submission
- Send to admin for record keeping
- Include PDF attachments

### 3. Consignment Expiry Tracking
- Cron job to check approaching expiry dates
- Send reminders 30 days, 7 days before expiry
- Notify admin of expired consignments
- Auto-generate return notification

### 4. Admin Dashboard Views
- View signed agreements
- Download PDFs
- Track consignment periods
- See expiring consignments

### 5. SARS VAT 264 (If Applicable)
- Determine if needed for all transactions
- Add as additional step or document
- Collect signature on last page only

## Testing Checklist

### Consignment Agreement:
- [ ] All 12 sections display correctly
- [ ] Date selector works (min date = today)
- [ ] Date appears in acceptance text
- [ ] Cannot submit without date
- [ ] Cannot submit without checkbox
- [ ] Client info from Steps 1-2 used correctly
- [ ] Keysers info pre-filled correctly

### Supplier's Invoice:
- [ ] All 9 sections display correctly
- [ ] Banking details from Step 3 referenced
- [ ] Company info displayed correctly
- [ ] Cannot submit without checkbox
- [ ] Electronic signature notice clear

### Mixed Scenario:
- [ ] Both agreements display
- [ ] Both acceptances required
- [ ] Consignment date required
- [ ] All validations work

---

**Implementation Status:** ✅ Complete  
**Legal Text:** ✅ Using actual agreements  
**All Required Fields:** ✅ Collected  
**Electronic Signatures:** ✅ Compliant  
**Ready For:** PDF generation and backend storage
